var g_canvas;
var g_video;

var g_tiltX = 0;
var g_tiltY = 0;
var g_scale = 2.;
var g_translate = [0, 0];

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
    }
}, false);


function resizeCanvasFullscreen(){
    g_canvas.style.width = window.innerWidth + 'px';
    g_canvas.style.height = window.innerHeight + 'px';
    g_canvas.width = window.innerWidth * window.devicePixelRatio;
    g_canvas.height = window.innerHeight * window.devicePixelRatio;
}


function setupGL(canvas, fragId){
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    var program = gl.createProgram();
    attachShader(gl, fragId, program, gl.FRAGMENT_SHADER);
    attachShader(gl, 'vs', program, gl.VERTEX_SHADER);
    program = linkProgram(gl, program);

    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(program, 'u_texture');
    uniLocation[1] = gl.getUniformLocation(program, 'u_iResolution');
    uniLocation[2] = gl.getUniformLocation(program, 'u_camResolution');
    uniLocation[3] = gl.getUniformLocation(program, 'u_iGlobalTime');
    uniLocation[4] = gl.getUniformLocation(program, 'u_tilt');
    uniLocation[5] = gl.getUniformLocation(program, 'u_scale');
    uniLocation[6] = gl.getUniformLocation(program, 'u_translate');

    var position = [-1, -1,
                    -1, 1,
                    1, -1,
                    1, 1
                   ];

    var vPosition = createVbo(gl, position);
    var vAttLocation = gl.getAttribLocation(program, 'a_vert');
    gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 2, gl.FLOAT, false, 0, 0);

    var videoTexture = gl.createTexture(gl.TEXTURE_2D);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, g_video);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return [gl, uniLocation];
}

function render(){
    var [gl, uniLocation] = setupGL(g_canvas, 'hyperbolic-tessellator');

    var startTime = new Date().getTime();
    (function(){
        var elapsedTime = new Date().getTime() - startTime;

        function renderGL(gl, uniLocation, canvas){
            gl.viewport(0, 0, g_canvas.width, g_canvas.height);

            gl.uniform2fv(uniLocation[1], [canvas.width, canvas.height]);
            gl.uniform2fv(uniLocation[2], [g_video.videoWidth, g_video.videoHeight]);
            gl.uniform1f(uniLocation[3], elapsedTime * 0.001);
            gl.uniform2fv(uniLocation[4], [g_tiltX, g_tiltY]);
            gl.uniform1f(uniLocation[5], g_scale);
            gl.uniform2fv(uniLocation[6], g_translate);

	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, g_video);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	    gl.flush();
        }
        renderGL(gl, uniLocation, g_canvas);

	requestAnimationFrame(arguments.callee);
    })();
}

window.addEventListener('load', function(event){
    g_canvas = document.getElementById('canvas');
    resizeCanvasFullscreen();
    setWebcam();
}, false);
