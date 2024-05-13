FROM python:3.12

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

EXPOSE 1337

CMD [ "powershell", "flask --app . run --debug" ]