var HyperbolicTessellator = function(){
    this.fragId = 'hyperbolic-tessellator';
    this.vertId = 'vs';
    this.tilt = [0, 0];
}

HyperbolicTessellator.prototype = {
    setUniformLocation: function(uniLocation, gl, program){
        uniLocation.push(gl.getUniformLocation(program, 'u_tilt'));
    },
    setUniformValues: function(uniLocation, gl, uniI){
        gl.uniform2fv(uniLocation[uniI++], this.tilt);
        return uniI;
    }
}

var RenderCanvas = function(canvasId){
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    var vertex = [
            -1, -1,
            -1, 1,
             1, -1,
             1, 1
    ];
    this.vertexBuffer = createVbo(this.gl, vertex);

    
    this.scale = 2.;
    this.translate = [0, 0];

    this.pixelDensity = window.devicePixelRatio;
    this.canPlayVideo = false;
    this.video;
    this.videoTexture;
    this.videoResolution = [0, 0];
    // Use this texture while loading video.
    this.dummyTexture = this.createTexture(this.gl, 128, 128);

    this.render = function(){};

    this.resizeCanvasFullscreen();
}

RenderCanvas.prototype = {
    resizeCanvasFullscreen: function(){
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
	this.canvas.width = window.innerWidth * this.pixelDensity;
	this.canvas.height = window.innerHeight * this.pixelDensity;
	this.center = [this.canvas.width / 2, this.canvas.height / 2];
	this.canvasRatio = this.canvas.width / this.canvas.height / 2.;
    },
    calcPixel: function(mx, my){
	var rect = this.canvas.getBoundingClientRect();
	return [this.scale * (((mx - rect.left) * this.pixelRatio) / this.canvas.height - this.canvasRatio) +
		this.translate[0],
		this.scale * -(((my - rect.top) * this.pixelRatio) / this.canvas.height - 0.5) +
		this.translate[1]];
    },
    setWebcam: function (){
        var renderCanvas = this;
        navigator.getUserMedia = (
	    navigator.getUserMedia ||
	        navigator.webkitGetUserMedia ||
	        navigator.mozGetUserMedia
        );

        if(navigator.getUserMedia){
	    navigator.getUserMedia(
	        {video: true,
	         audio: false},
	        function(localMediaStream){
		    var url = (
		        window.URL ||
			    window.webkitURL ||
			    window.mozURL
		    );
		    renderCanvas.video = document.createElement('video');
                    renderCanvas.video.src = url.createObjectURL(localMediaStream);
                    var canplayListener = function(){
                        renderCanvas.video.removeEventListener('canplay', arguments.callee, true);
		        renderCanvas.video.play();
                        renderCanvas.videoResolution = [renderCanvas.video.videoWidth,
                                                        renderCanvas.video.videoHeight];
                        renderCanvas.videoTexture = renderCanvas.createTexture(renderCanvas.gl,
                                                                               renderCanvas.video.videoWidth,
                                                                               renderCanvas.video.videoHeight);
                        renderCanvas.canPlayVideo = true;
		    }
		    renderCanvas.video.addEventListener('canplay', canplayListener, true);
	        },
	        function(err){
		    if(err.name === 'PermissionDeniedError'){
		        alert('denied permission');
		    }else{
		        alert('can not be used webcam');
		    }
	        }
	    );
        }else{
	    alert('not supported getUserMedia');
        }
    },
    createTexture: function(gl, width, height){
        var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height,
                      0, gl.RGB, type, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    },
    setUniformLocation: function(uniLocation, gl, program){
        uniLocation.push(gl.getUniformLocation(program, 'u_texture'));
        uniLocation.push(gl.getUniformLocation(program, 'u_iResolution'));
        uniLocation.push(gl.getUniformLocation(program, 'u_iGlobalTime'));
        uniLocation.push(gl.getUniformLocation(program, 'u_scale'));
        uniLocation.push(gl.getUniformLocation(program, 'u_translate'));
    },
    setUniformValues: function(uniLocation, gl, uniI, width, height){
        gl.activeTexture(gl.TEXTURE0);
        if(this.canPlayVideo){
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
            gl.uniform1i(uniLocation[uniI++], this.videoTexture);
        }else{
            gl.bindTexture(gl.TEXTURE_2D, this.dummyTexture);
            gl.uniform1i(uniLocation[uniI++], this.dummyTexture);
        }
        gl.uniform2fv(uniLocation[uniI++], [width, height]);
        gl.uniform1f(uniLocation[uniI++], 0);
        gl.uniform1f(uniLocation[uniI++], this.scale);
        gl.uniform2fv(uniLocation[uniI++], this.translate);
        return uniI;
    }
}

function setupGL(renderCanvas, hyperbolicTessellator){
    var gl = renderCanvas.gl;
    var program = gl.createProgram();
    attachShader(gl, hyperbolicTessellator.fragId, program, gl.FRAGMENT_SHADER);
    attachShader(gl, hyperbolicTessellator.vertId, program, gl.VERTEX_SHADER);
    program = linkProgram(gl, program);
    gl.useProgram(program);
    
    var vAttLocation = gl.getAttribLocation(program, 'a_vert');
    gl.bindBuffer(gl.ARRAY_BUFFER, renderCanvas.vertexBuffer);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 2, gl.FLOAT, false, 0, 0);

    var uniLocation = [];
    renderCanvas.setUniformLocation(uniLocation, gl, program);
    hyperbolicTessellator.setUniformLocation(uniLocation, gl, program);
    
    renderCanvas.render = function(){
        gl.viewport(0, 0,
                    renderCanvas.canvas.width,
                    renderCanvas.canvas.height);

        var uniI = 0;
        uniI = renderCanvas.setUniformValues(uniLocation, gl, uniI,
                                             renderCanvas.canvas.width,
                                             renderCanvas.canvas.height);
        uniI = hyperbolicTessellator.setUniformValues(uniLocation, gl, uniI);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.flush();
    }
}

window.addEventListener('load', function(event){
    var hyperbolicTessellator = new HyperbolicTessellator();
    var renderCanvas = new RenderCanvas('canvas');
    renderCanvas.setWebcam();

    setupGL(renderCanvas, hyperbolicTessellator);

    window.addEventListener('resize', function(event){
        renderCanvas.resizeCanvasFullscreen();
    });
    
    (function(){
	renderCanvas.render();
	requestAnimationFrame(arguments.callee);
    })();
});
