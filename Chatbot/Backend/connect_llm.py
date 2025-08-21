import os
import faiss
import numpy as np
from pathlib import Path
from langchain_community.vectorstores import FAISS
from langchain.docstore.in_memory import InMemoryDocstore
from langchain_huggingface import HuggingFaceEndpoint, HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv, find_dotenv


load_dotenv(find_dotenv())
HF_TOKEN = os.getenv("HF_TOKEN")


def load_hf_embeddings():
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


def load_faiss_db(path):
    try:
        faiss_db = FAISS.load_local(path, embeddings=load_hf_embeddings(), allow_dangerous_deserialization=True)
        print("FAISS database loaded successfully.")
        return faiss_db
    except Exception as e:
        print(f"Error loading FAISS database: {e}")
        return None


def create_qa_chain(vector_db):
    if not vector_db:
        print("Vector database is not available. Cannot create QA chain.")
        return None
        
    repo_id = "mistralai/Mistral-7B-Instruct-v0.3"
    llm = HuggingFaceEndpoint(
        repo_id=repo_id,
        huggingfacehub_api_token=HF_TOKEN,
        temperature=0.1
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_db.as_retriever(),
        return_source_documents=True
    )
    return qa_chain

if __name__ == "__main__":
    FAISS_DB_PATH = 'FAISS_DB/'  
    

    db = load_faiss_db(FAISS_DB_PATH)
    
    if db:
        qa_chain = create_qa_chain(db)
        
        if qa_chain:
            while True:
                user_query = input("Ask a question: ")
                if user_query.lower() == 'exit':
                    break
                response = qa_chain.invoke({'query': user_query})
                print("Result:", response['result'])
                print("Source Documents:", response['source_documents'])
