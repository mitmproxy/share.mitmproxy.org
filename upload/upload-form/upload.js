+ function() {
    'use strict';

    var dropZone = document.getElementById('drop-zone');
    var uploadForm = document.getElementById('js-upload-form');
    var result = document.getElementById('result');

    var startUpload = function(files) {
        var file = files[0];
        var fd = new FormData();
        var id = (+new Date * Math.random()).toString(36).substring(0,7);
        fd.append('key', id);
        fd.append('acl', 'bucket-owner-full-control');
        fd.append('Content-Type', 'application/octet-stream');
        fd.append('file', file);

        var url = 'http://upload.share.mitmproxy.org.s3.amazonaws.com'
        return fetch(url, {
            method: 'POST',
            body: fd,
        }).then( function(data) {
            console.log('URL at: share.mitmproxy.org/' + id);
            result.className = 'alert alert-success';
            result.textContent = 'Success! \n Share URL at: http://share.mitmproxy.org/' + id;
        }).catch( function(data) {
            result.className = 'alert alert-danger';
            result.textContent = 'Upload Failed!'
        })
    }

    uploadForm.addEventListener('submit', function(e) {
        var uploadFiles = document.getElementById('js-upload-files').files;
        e.preventDefault()
        startUpload(uploadFiles)
    })

    dropZone.ondrop = function(e) {
        e.preventDefault();
        this.className = 'upload-drop-zone';

        startUpload(e.dataTransfer.files)
    }

    dropZone.ondragover = function() {
        this.className = 'upload-drop-zone drop';
        return false;
    }

    dropZone.ondragleave = function() {
        this.className = 'upload-drop-zone';
        return false;
    }

}();

