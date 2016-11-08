# GeThis
GeThis (procounced "get this") is a web controllet utility to download files to a remote server.

## Running
GeThis can be run either as a Docker container or as a Node.js app.

### Docker
```
# docker run -d -v /host-dir:/gethis/download -p 8080:8080 jenrik/gethis
```

### Node.js app
You will need to have both Node.js and Bower installed
```
# git clone https://github.com/jenrik/gethis.git
# cd gethis
# npm install
# npm start
```

## License
GeThis is licensed on the MIT license. The full license text is available in the LICENSE file.
