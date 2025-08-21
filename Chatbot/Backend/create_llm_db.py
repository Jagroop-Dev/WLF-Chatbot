import pandas as pd
import os
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from PIL import Image
import numpy as np
import torch
from langchain.embeddings.base import Embeddings

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())


DATA_PATH="Cleaned Data/"
def load_pdf_files(data):
    loader = DirectoryLoader(data,
                             glob='*.pdf',
                             loader_cls=PyPDFLoader)
    
    documents=loader.load()
    return documents

documents=load_pdf_files(data=DATA_PATH)


def create_chunks(extracted_data):
    text_splitter=RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    text_chunks=text_splitter.split_documents(extracted_data)
    return text_chunks


text_chunks= create_chunks(documents)


def get_ve_model():
    ve_model= HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L12-v2")
    return ve_model


embedding_model = get_ve_model()


FAISS_DB_PATH = 'FAISS Database/'

db=FAISS.from_documents(text_chunks, embedding_model)
db.save_local(FAISS_DB_PATH)


