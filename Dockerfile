FROM node:6

RUN ["npm", "install", "-g", "bower"]
ADD . /gethis
WORKDIR /gethis
RUN ["npm", "install"]
RUN ["bower", "--allow-root", "install"]

VOLUME ["/gethis/download"]
EXPOSE 8080

CMD ["npm", "start"]
