import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.vectorstores import FAISS

app = Flask(__name__)
CORS(app)

# NOTE: This path should be relative to     your project's root or an absolute path.
FAISS_DB_PATH = '../Backend/FAISS Database/'

# Load vector store only once when the app starts
# This is analogous to Streamlit's caching but for a Flask app
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L12-v2")
db = FAISS.load_local(FAISS_DB_PATH, embedding_model, allow_dangerous_deserialization=True)
print("Vector store loaded successfully.") # Optional: a log to confirm it loaded

def set_custom_prompt():
    custom_prompt_template = """
    You are a The Last of Us Part 2 expert assistant. Use the provided context to answer the user's question accurately and comprehensively.

GUIDELINES:
- Answer directly and concisely
- If the context contains spoiler warnings (⚠️), include them before revealing spoilers
- If you don't have the information, state "I don't have that information in the provided context"
- Stick to the provided context only
- For weapon/item locations, include specific chapter and area details
- For safe codes, provide both the code and how to find it
- For easter egg queries take a look inside the THE LAST OF US PART 2 - 25 Easter Eggs Secrets  References.pdf to answer
- For speed run queries takw a look inside the Updated The Last of Us Part II Remastered Grounded Speedrun Tutorial pdfs to answer


    Context: {context}
    Question: {question}

    Start the answer directly. No small talk please.
    """
    prompt = PromptTemplate(template=custom_prompt_template, input_variables=["context", "question"])
    return prompt

def load_llm(huggingface_repo_id, HF_TOKEN):
    llm = HuggingFaceEndpoint(
        repo_id=huggingface_repo_id,
        temperature=0.5,
        huggingfacehub_api_token=HF_TOKEN,
        task='conversational'
    )
    return llm

# The /ask endpoint to handle messages from the React frontend.
@app.route('/ask', methods=['POST'])
def ask_ai():
    # Get the JSON data sent from the React app.
    data = request.get_json()
    user_message = data.get('text')

    if not user_message:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Load Hugging Face API token from environment variable
        HF_TOKEN = os.environ.get('HF_TOKEN')
        if not HF_TOKEN:
            return jsonify({"error": "Hugging Face API token not found"}), 500

        # Define RAG components
        huggingface_repo_id = "mistralai/Mistral-7B-Instruct-v0.3"
        prompt = set_custom_prompt()
        chat_model = ChatHuggingFace(llm=load_llm(huggingface_repo_id=huggingface_repo_id, HF_TOKEN=HF_TOKEN))

        # Create the RAG chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=chat_model,
            chain_type="stuff",
            retriever=db.as_retriever(search_kwargs={'k': 3}),
            return_source_documents=False,
            chain_type_kwargs={'prompt': prompt}
        )

        # Invoke the chain with the user's message
        response = qa_chain.invoke({'query': user_message})
        bot_answer = response["result"]

        # Return the bot's response as JSON
        return jsonify({"answer": bot_answer})

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    # Start the Flask development server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
