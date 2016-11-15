var HyperbolicTessellator = function(){
    this.fragId = 'hyperbolic-tessellator';
    this.vertId = 'vs';

    this.tiltX = 0;
    this.tiltY = 0;
    this.mixFactor = 0;
    this.xyReverse = false;
    this.displayLine = false;
    this.displayOuter = false;
    this.hueStep = 0;
    this.hsvColor1 = { h: 0, s: 1, v: 1 };
    this.hsvColor2 = { h: 250, s: 1, v: 1 };
    this.outerHsvColor1 = { h: 180, s: 1, v: 1 };
    this.outerHsvColor2 = { h: 324, s: 1, v: 1 };
}

HyperbolicTessellator.prototype = {
    setUniformLocation: function(uniLocation, gl, program){
        uniLocation.push(gl.getUniformLocation(program, 'u_tilt'));
        uniLocation.push(gl.getUniformLocation(program, 'u_mixFactor'));
        uniLocation.push(gl.getUniformLocation(program, 'u_xyReverse'));
        uniLocation.push(gl.getUniformLocation(program, 'u_displayLine'));
        uniLocation.push(gl.getUniformLocation(program, 'u_displayOuter'));
        uniLocation.push(gl.getUniformLocation(program, 'u_hueStep'));
        uniLocation.push(gl.getUniformLocation(program, 'u_hsvColor1'));
        uniLocation.push(gl.getUniformLocation(program, 'u_hsvColor2'));
        uniLocation.push(gl.getUniformLocation(program, 'u_outerHsvColor1'));
        uniLocation.push(gl.getUniformLocation(program, 'u_outerHsvColor2'));
    },
    setUniformValues: function(uniLocation, gl, uniI){
        gl.uniform2fv(uniLocation[uniI++], [this.tiltX, this.tiltY]);
        gl.uniform1f(uniLocation[uniI++], this.mixFactor);
        gl.uniform1i(uniLocation[uniI++], this.xyReverse);
        gl.uniform1i(uniLocation[uniI++], this.displayLine);
        gl.uniform1i(uniLocation[uniI++], this.displayOuter);
        gl.uniform1f(uniLocation[uniI++], this.hueStep);
        gl.uniform3fv(uniLocation[uniI++], [this.hsvColor1.h / 360,
                                            this.hsvColor1.s,
                                            this.hsvColor1.v]);
        gl.uniform3fv(uniLocation[uniI++], [this.hsvColor2.h / 360,
                                            this.hsvColor2.s,
                                            this.hsvColor2.v]);
        gl.uniform3fv(uniLocation[uniI++], [this.outerHsvColor1.h / 360,
                                            this.outerHsvColor1.s,
                                            this.outerHsvColor1.v]);
        gl.uniform3fv(uniLocation[uniI++], [this.outerHsvColor2.h / 360,
                                            this.outerHsvColor2.s,
                                            this.outerHsvColor2.v]);
        return uniI;
    }
}

var RenderCanvas = function(canvasId){
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.canvasRatio =  this.canvas.width / this.canvas.height / 2.;
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

    this.isMousePressing = false;
    this.prevMousePos = [0, 0];
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
	return [this.scale * (((mx - rect.left) * this.pixelDensity) / this.canvas.height - this.canvasRatio) +
		this.translate[0],
		this.scale * -(((my - rect.top) * this.pixelDensity) / this.canvas.height - 0.5) +
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

    renderCanvas.canvas.addEventListener("contextmenu", function(event){
	// disable right-click context-menu
        event.preventDefault();
    });
    
    renderCanvas.canvas.addEventListener('mousewheel', function(event){
	event.preventDefault();
	if(event.wheelDelta > 0){
            renderCanvas.scale *= 0.75;
	}else{
            renderCanvas.scale *= 1.5;
	}
    });

    renderCanvas.canvas.addEventListener('mouseup', function(event){
	renderCanvas.isMousePressing = false;
    });

    renderCanvas.canvas.addEventListener('mousedown', function(event){
	event.preventDefault();
	var mouse = renderCanvas.calcPixel(event.clientX, event.clientY);
        renderCanvas.prevMousePos = mouse;
	renderCanvas.isMousePressing = true;
    });

    renderCanvas.canvas.addEventListener('mousemove', function(event){
	if(!renderCanvas.isMousePressing) return;
	var mouse = renderCanvas.calcPixel(event.clientX, event.clientY);
	if(event.button == 2){
            renderCanvas.translate[0] -= mouse[0] - renderCanvas.prevMousePos[0];
            renderCanvas.translate[1] -= mouse[1] - renderCanvas.prevMousePos[1];
        }
    });

    var gui = new dat.GUI();
    var f1 = gui.addFolder('Parameter');
    f1.add(hyperbolicTessellator, 'tiltX', -1.5, 1.5).step(0.01);
    f1.add(hyperbolicTessellator, 'tiltY', -1.5, 1.5).step(0.01);
    f1.add(hyperbolicTessellator, 'xyReverse');
    f1.add(hyperbolicTessellator, 'displayLine');
    f1.add(hyperbolicTessellator, 'displayOuter');
    var f2 = gui.addFolder('Color');
    f2.add(hyperbolicTessellator, 'mixFactor', 0, 1).step(0.01);
    f2.add(hyperbolicTessellator, 'hueStep', 0, 1).step(0.01);
    f2.addColor(hyperbolicTessellator, 'hsvColor1');
    f2.addColor(hyperbolicTessellator, 'hsvColor2');
    f2.addColor(hyperbolicTessellator, 'outerHsvColor1');
    f2.addColor(hyperbolicTessellator, 'outerHsvColor2');
    console.log('hoge');
    (function(){
	renderCanvas.render();
	requestAnimationFrame(arguments.callee);
    })();
});
