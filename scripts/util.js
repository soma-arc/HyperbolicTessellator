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
