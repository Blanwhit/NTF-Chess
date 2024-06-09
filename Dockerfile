FROM python:3.12

#COPY . /app
WORKDIR /webapp

COPY ./requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

RUN flask --app webapp init-db

CMD ["python", "main.py" ] 
