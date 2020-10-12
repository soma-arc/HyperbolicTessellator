var HyperbolicTessellator = function(){
    this.fragId = 'hyperbolic-tessellator';
    this.fragId3d = 'hyperbolic-tessellator-3d';
    this.vertId = 'vs';

    this.tiltX = 0;
    this.tiltY = 0;
    this.mixFactor = 0.5;
    this.xyReverse = false;
    this.displayLine = false;
    this.displayOuter = false;
    this.hueStep = 0;
    this.hsvColor1 = { h: 0, s: 1, v: 1 };
    this.hsvColor2 = { h: 180, s: 1, v: 1 };
    this.outerHsvColor1 = { h: 90, s: 1, v: 1 };
    this.outerHsvColor2 = { h: 270, s: 1, v: 1 };
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

const RENDER_2D = 0;
const RENDER_3D = 1;
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

    this.render2d = function(){};
    this.render3d = function(){};

    this.camera = new Camera([0, 0.5, 0], 60, 2, [0, 1, 0]);

    this.resizeCanvasFullscreen();

    this.isMousePressing = false;
    this.prevMousePos = [0, 0];

    this.isDisplayingInstruction = false;

    this.renderMode = RENDER_2D;
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
        var media = {video: true, audio: false};
        var successCallback = function(localMediaStream){
	        renderCanvas.video = document.createElement('video');
            // https://stackoverflow.com/questions/27120757/failed-to-execute-createobjecturl-on-url
            //renderCanvas.video.src = window.URL.createObjectURL(localMediaStream);
            renderCanvas.video.srcObject = localMediaStream;
            var canplayListener = function(){
                renderCanvas.video.removeEventListener('canplay', arguments.callee, false);
                renderCanvas.videoResolution = [renderCanvas.video.videoWidth,
                                                renderCanvas.video.videoHeight];
                renderCanvas.videoTexture = renderCanvas.createTexture(renderCanvas.gl,
                                                                       renderCanvas.video.videoWidth,
                                                                       renderCanvas.video.videoHeight);
                renderCanvas.canPlayVideo = true;
	    }//
	    renderCanvas.video.addEventListener('canplay', canplayListener, false);
            renderCanvas.video.play();
	}
        var failureCallback = function(err){
	    if(err.name === 'PermissionDeniedError'){
		alert('denied permission');
	    }else{
		alert('can not be used webcam');
	    }
	}

        if(navigator.mediaDevices.getUserMedia){
            navigator.mediaDevices.getUserMedia(media).then(successCallback, failureCallback);
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
            var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, type, this.video);
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
    },
    saveImage: function(){
        this.render();
        var a = document.createElement('a');
        a.href = this.canvas.toDataURL();
        a.download = "tessellation.png"
        a.click();
    },
    viewSource: function(){
        window.open('https://github.com/soma-arc/HyperbolicTessellator');
    },
    viewInstruction: function(){
	this.isDisplayingInstruction = true;
    },
    render: function(){
        if(this.renderMode == RENDER_2D){
            this.render2d();
        }else if(this.renderMode == RENDER_3D){
            this.render3d();
        }
    }
}

var Camera = function(target, fovDegree, eyeDist, up){
    this.target = target;
    this.prevTarget = target;
    this.fovDegree = fovDegree;
    this.eyeDist = eyeDist;
    this.up = up;
    this.theta = 0;
    this.phi = 0;
    this.position;
    this.update();

    this.prevTarget;
}

// Camera is on the sphere which its center is target and radius is eyeDist.
// Position is defined by two angle, theta and phi.
Camera.prototype = {
    update: function(){
	this.position = [this.eyeDist * Math.cos(this.phi) * Math.cos(this.theta),
			 this.eyeDist * Math.sin(this.phi),
			 -this.eyeDist * Math.cos(this.phi) * Math.sin(this.theta)];
	this.position = [this.target[0] + this.position[0],
                         this.target[1] + this.position[1],
                         this.target[2] + this.position[2]];
	if(Math.abs(this.phi) % (2 * Math.PI) > Math.PI / 2. &&
	   Math.abs(this.phi) % (2 * Math.PI) < 3 * Math.PI / 2.){
	    this.up = [0, -1, 0];
	}else{
	    this.up = [0, 1, 0];
	}
    },
    setUniformLocation: function(uniLocation, gl, program){
        uniLocation.push(gl.getUniformLocation(program, 'u_camera'));
    },
    setUniformValues: function(uniLocation, gl, uniI){
        gl.uniform3fv(uniLocation[uniI++],
                      this.position.concat(this.target,
                                           this.up,
                                           [this.fovDegree, 0, 0]));
        return uniI;
    },
    mouseDown: function(event){
        if(event.buttons == 4){
            this.prevTheta = this.theta;
            this.prevPhi = this.phi;
        }
    },
    mouseWheel: function(event){
        if(event.deltaY < 0){
            this.eyeDist *= 0.75;
	}else{
            this.eyeDist *= 1.5;
	}
        this.update();
    },
    mouseMove: function(event, mousePos, prevMousePos){
        if(event.buttons == 4){
            this.theta = this.prevTheta + (prevMousePos[0] - mousePos[0]);
            this.phi = this.prevPhi + (prevMousePos[1] - mousePos[1]);
            this.update();
        }
    }
}

function setupGL(renderCanvas, hyperbolicTessellator){
    var gl = renderCanvas.gl;
    var program = gl.createProgram();
    attachShader(gl, hyperbolicTessellator.fragId, program, gl.FRAGMENT_SHADER);
    attachShader(gl, hyperbolicTessellator.vertId, program, gl.VERTEX_SHADER);
    program = linkProgram(gl, program);

    var program3d = gl.createProgram();
    attachShader(gl, hyperbolicTessellator.fragId3d, program3d, gl.FRAGMENT_SHADER);
    attachShader(gl, hyperbolicTessellator.vertId, program3d, gl.VERTEX_SHADER);
    program3d = linkProgram(gl, program3d);

    var vAttLocation = gl.getAttribLocation(program, 'a_vert');
    gl.bindBuffer(gl.ARRAY_BUFFER, renderCanvas.vertexBuffer);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 2, gl.FLOAT, false, 0, 0);

    var uniLocation = [];
    renderCanvas.setUniformLocation(uniLocation, gl, program);
    hyperbolicTessellator.setUniformLocation(uniLocation, gl, program);

    renderCanvas.render2d = function(){
        gl.useProgram(program);
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

    var uniLocation3d = [];
    renderCanvas.setUniformLocation(uniLocation3d, gl, program3d);
    renderCanvas.camera.setUniformLocation(uniLocation3d, gl, program3d);
    hyperbolicTessellator.setUniformLocation(uniLocation3d, gl, program3d);

    renderCanvas.render3d = function(){
        gl.useProgram(program3d);
        gl.viewport(0, 0,
                    renderCanvas.canvas.width,
                    renderCanvas.canvas.height);

        var uniI = 0;
        uniI = renderCanvas.setUniformValues(uniLocation3d, gl, uniI,
                                             renderCanvas.canvas.width,
                                             renderCanvas.canvas.height);
        uniI = renderCanvas.camera.setUniformValues(uniLocation3d, gl, uniI);
        uniI = hyperbolicTessellator.setUniformValues(uniLocation3d, gl, uniI);

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

    renderCanvas.canvas.addEventListener('wheel', function(event){
	event.preventDefault();
        if(renderCanvas.renderMode == RENDER_2D){
	    if(event.deltaY < 0){
                renderCanvas.scale *= 0.75;
	    }else{
                renderCanvas.scale *= 1.5;
	    }
        }else if(renderCanvas.renderMode == RENDER_3D){
            renderCanvas.camera.mouseWheel(event);
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
        if(renderCanvas.renderMode == RENDER_3D)
            renderCanvas.camera.mouseDown(event);
    });

    renderCanvas.canvas.addEventListener('mousemove', function(event){
	if(!renderCanvas.isMousePressing) return;
	var mouse = renderCanvas.calcPixel(event.clientX, event.clientY);
        if(renderCanvas.renderMode == RENDER_2D){
	    if(event.buttons == 2){
                // right click
                renderCanvas.translate[0] -= mouse[0] - renderCanvas.prevMousePos[0];
                renderCanvas.translate[1] -= mouse[1] - renderCanvas.prevMousePos[1];
            }
        }else if(renderCanvas.renderMode == RENDER_3D){
            renderCanvas.camera.mouseMove(event, mouse, renderCanvas.prevMousePos);
        }
    });

    var gui = new dat.GUI();
    var f1 = gui.addFolder('Parameter');
    f1.add(hyperbolicTessellator, 'tiltX', -1.5, 1.5).step(0.001);
    f1.add(hyperbolicTessellator, 'tiltY', -1.5, 1.5).step(0.001);
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
    var f3 = gui.addFolder('Others');
    f3.add(renderCanvas, 'renderMode', { "2D" : RENDER_2D, "3D" : RENDER_3D });
    f3.add(renderCanvas, 'saveImage');
    f3.add(renderCanvas, 'viewSource');

    Vue.use(Keen);
    var app = new Vue({
	el: '#htmlElem',
	data: {renderCanvas: renderCanvas},
    });

    f3.add(renderCanvas, 'viewInstruction');

    (function(){
	renderCanvas.render();
	requestAnimationFrame(arguments.callee);
    })();
});
