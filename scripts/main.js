var g_canvas;
var g_video;

var g_midi;
var g_tiltX = 0;
var g_tiltY = 0;
var g_scale = 2.;
var g_translate = [0, 0];

var KorgNanoKontrol = new Object();
KorgNanoKontrol.knob = new Object();
KorgNanoKontrol.slider = new Object();
KorgNanoKontrol.buttonS = new Object();
KorgNanoKontrol.buttonM = new Object();
KorgNanoKontrol.buttonR = new Object();
KorgNanoKontrol.buttonCycle = 46;
KorgNanoKontrol.controlListeners = new Object();
for(var i = 0 ; i < 8 ; i++){
    KorgNanoKontrol.slider[i] = i;
    KorgNanoKontrol.knob[i] = 16 + i;
    KorgNanoKontrol.buttonS[i] = 33 + i;
    KorgNanoKontrol.buttonM[i] = 48 + i;
    KorgNanoKontrol.buttonR[i] = 64 + i;
}

KorgNanoKontrol.addControlListaner = function(inputId, listener){
    KorgNanoKontrol.controlListeners[inputId] = listener;
}
KorgNanoKontrol.onMidiMessage = function(inputId, value){
    if(KorgNanoKontrol.controlListeners[inputId] != undefined)
        KorgNanoKontrol.controlListeners[inputId](value);
}

function success(midiAccess){
    g_midi = midiAccess;
    console.log("MIDI SUCCESS");
    setInputs(midiAccess);
}

function failure(msg){
    console.log("MIDI FAILED - " + msg);
}

function setInputs(midiAccess){
    var inputs = midiAccess.inputs;
    inputs.forEach(function(key, port){
        console.log("[" + key.state + "] manufacturer:" + key.manufacturer + " / name:" + key.name + " / port:" + port);
        key.onmidimessage = onMidiMessage;
    });
}

function onMidiMessage(event){
    console.log(event);
    var str = '';
    for (var i = 0; i < event.data.length; i++) {
        str += event.data[i] + ':';
    }
    console.log(str);
    KorgNanoKontrol.onMidiMessage(event.data[1], event.data[2]);
}

function setWebcam(){
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
		g_video = document.createElement('video');
		g_video.addEventListener('canplay', function(){
		    g_video.removeEventListener('canplay', arguments.callee, true);
		    g_video.play();
		    render();
		}, true);

		g_video.src = url.createObjectURL(localMediaStream);
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
}

window.addEventListener('load', function(event){
    var i = 0;
    KorgNanoKontrol.addControlListaner(KorgNanoKontrol.knob[i++],
                                       function(value){
                                           g_tiltX = (value) / 127 * Math.PI / 2.;
                                       });
     KorgNanoKontrol.addControlListaner(KorgNanoKontrol.knob[i++],
                                        function(value){
                                            g_tiltY = (value - 64) / 64 * Math.PI / 5.5;
                                        });
    KorgNanoKontrol.addControlListaner(KorgNanoKontrol.knob[i++],
                                       function(value){
                                           g_scale = .1 + value / 10;
                                       });
    KorgNanoKontrol.addControlListaner(KorgNanoKontrol.knob[i++],
                                       function(value){
                                           g_translate[0] = (value - 64) / 16;
                                       });
    KorgNanoKontrol.addControlListaner(KorgNanoKontrol.knob[i++],
                                       function(value){
                                           g_translate[1] = (value - 64) / 16;
                                       });
    KorgNanoKontrol.addControlListaner(KorgNanoKontrol.buttonCycle,
                                       function(value){
                                           location.reload();
                                       });
    navigator.requestMIDIAccess().then(success, failure)
    g_canvas = document.getElementById('canvas');
    resizeCanvasFullscreen();
    setWebcam();
}, false);

window.addEventListener('resize', function(event){
    resizeCanvasFullscreen();
}, false);

window.addEventListener('keydown', function(event){
   if(event.key == 'ArrowRight'){
	g_tiltX += 0.05;
    }else if(event.key == 'ArrowLeft'){
	g_tiltX -= 0.05;
    }else if(event.key == 'ArrowUp'){
	g_tiltY += 0.05;
    }else if(event.key == 'ArrowDown'){
	g_tiltY -= 0.05;
    }else if(event.key == 'n'){
	g_scale += 0.05;
    }else if(event.key == 'p'){
	g_scale -= 0.05;
    }else if(event.key == 'w'){
	g_translate[1] -= 0.1;
    }else if(event.key == 's'){
	g_translate[1] += 0.1;
    }else if(event.key == 'a'){
	g_translate[0] -= 0.1;
    }else if(event.key == 'd'){
	g_translate[0] += 0.1;
    }else if(event.key == 'i'){
	g_lgtmTranslate[1] -= 0.1;
    }else if(event.key == 'k'){
	g_lgtmTranslate[1] += 0.1;
    }else if(event.key == 'j'){
	g_lgtmTranslate[0] += 0.1;
    }else if(event.key == 'l'){
	g_lgtmTranslate[0] -= 0.1;
    }
}, false);

/*
var g_scaleFactor = 0.1;
window.onmousewheel = function(event){
    if(event.wheelDelta < 0.){
        if((g_scale + g_scaleFactor) / 10 > g_scale / 10){
            g_scaleFactor *= 10;
        }
        g_scale += g_scaleFactor;
    }else{
        if(g_scale - g_scaleFactor <= 0.){
            g_scaleFactor /= 10;
        }
        g_scale -= g_scaleFactor;
    }
}
*/

function resizeCanvasFullscreen(){
    g_canvas.style.width = window.innerWidth + 'px';
    g_canvas.style.height = window.innerHeight + 'px';
    g_canvas.width = window.innerWidth * window.devicePixelRatio;
    g_canvas.height = window.innerHeight * window.devicePixelRatio;
}

var g_videoTexture;
var g_lgtmTranslate = [0, 0.2];
function setupGL(canvas, fragId){
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    var program = gl.createProgram();
    attachShader(gl, fragId, program, gl.FRAGMENT_SHADER);
    attachShader(gl, 'vs', program, gl.VERTEX_SHADER);
    program = linkProgram(gl, program);
	
    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(program, 'texture');
    uniLocation[1] = gl.getUniformLocation(program, 'iResolution');
    uniLocation[2] = gl.getUniformLocation(program, 'camResolution');
    uniLocation[3] = gl.getUniformLocation(program, 'iGlobalTime');
    uniLocation[4] = gl.getUniformLocation(program, 'tilt');
    uniLocation[5] = gl.getUniformLocation(program, 'scale');
    uniLocation[6] = gl.getUniformLocation(program, 'translate');
    uniLocation[7] = gl.getUniformLocation(program, 'tex2');
    uniLocation[8] = gl.getUniformLocation(program, 'lgtmTranslate');

    var position = [-1.0, 1.0, 0.0,
                    1.0, 1.0, 0.0,
	            -1.0, -1.0,  0.0,
	            1.0, -1.0, 0.0
                   ];
    var index = [
	0, 2, 1,
	1, 2, 3
    ];
    var vPosition = createVbo(gl, position);
    var vIndex = createIbo(gl, index);
    var vAttLocation = gl.getAttribLocation(program, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);

    g_videoTexture = gl.createTexture(gl.TEXTURE_2D);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, g_video);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return [gl, uniLocation];
}

function render(){
    var [gl, uniLocation] = setupGL(g_canvas, 'hyperbolic-tessellator');

    var texture1 = gl.createTexture(gl.TEXTURE_2D);

    var lgtm = new Image();
    lgtm.onload = function(){
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture1);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, lgtm);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    lgtm.src = "img/LGTM.png";
    
    var startTime = new Date().getTime();
    (function(){
        var elapsedTime = new Date().getTime() - startTime;
	g_tiltX = Math.abs(Math.sin(elapsedTime/ 500.));
	g_lgtmTranslate[1] = .8 * Math.abs(Math.sin(elapsedTime/ 500.));
        function renderGL(gl, uniLocation, canvas){
            gl.viewport(0, 0, g_canvas.width, g_canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, g_videoTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, g_video);
	    gl.uniform1i(uniLocation[0], 0);
            gl.uniform2fv(uniLocation[1], [canvas.width, canvas.height]);
            gl.uniform2fv(uniLocation[2], [g_video.videoWidth, g_video.videoHeight]);
            gl.uniform1f(uniLocation[3], elapsedTime * 0.001);
            gl.uniform2fv(uniLocation[4], [g_tiltX, g_tiltY]);
            gl.uniform1f(uniLocation[5], g_scale);
            gl.uniform2fv(uniLocation[6], g_translate);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, texture1);
	    gl.uniform1i(uniLocation[7], 1);
	    gl.uniform2fv(uniLocation[8], g_lgtmTranslate);

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	    gl.flush();
        }
        renderGL(gl, uniLocation, g_canvas);

	requestAnimationFrame(arguments.callee);
    })();
}

function attachShader(gl, shaderId, program, shaderType){
    var shader = gl.createShader(shaderType);
    elem = document.getElementById(shaderId).text;
    gl.shaderSource(shader, elem);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        gl.attachShader(program, shader);
    }else{
	alert(gl.getShaderInfoLog(shader));
	console.log(gl.getShaderInfoLog(shader));
    }
}

function linkProgram(gl, program){
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
	gl.useProgram(program);
	return program;
    }else{
	return null;
    }
}

function createVbo(gl, data){
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
}

function createIbo(gl, data){
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
}
