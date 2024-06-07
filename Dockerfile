FROM python:3.12

#COPY . /app
WORKDIR /webapp

COPY ./requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

EXPOSE 1337
 
CMD ["python", "main.py" ] 
