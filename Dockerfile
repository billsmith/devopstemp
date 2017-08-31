FROM ubuntu
RUN apt-get update && apt-get install -y nodejs np
RUN npm install -g firebase-tools

