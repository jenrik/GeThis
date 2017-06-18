# GeThis
GeThis (pronounced "get this") is a web controlled utility to download files to a remote server

## Running
GeThis can be run either inside Docker container or as a standalone Node.js app

### Docker
```
# git clone https://github.com/jenrik/gethis.git
# cd gethis
# docker build --tag="gethis" .
# docker run -d -v $HOSTDIR:/gethis/download -p 8080:8080 gethis
```

### Node.js app
You will need to have both Node.js, npm and Bower installed
```
# git clone https://github.com/jenrik/gethis.git
# cd gethis
# npm install
# npm start
```

## Screenshots
![Main view](https://raw.github.com/jenrik/gethis/master/screenshots/main-view.png)
![Download dialog](https://raw.github.com/jenrik/gethis/master/screenshots/download-dialog.png)

## License
GeThis is licensed under the MIT license. The full license text is available in the LICENSE file.
