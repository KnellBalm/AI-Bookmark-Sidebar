FROM alpine:3.19

RUN apk add --no-cache zip

WORKDIR /app

COPY extension ./extension

RUN mkdir -p dist && \
    cd extension && \
    zip -r /app/dist/ai-bookmarker.zip .

CMD ["sh", "-c", "echo 'Built ./dist/ai-bookmarker.zip' && ls -R /app"]