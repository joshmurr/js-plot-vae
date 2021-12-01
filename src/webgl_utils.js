function createProgram(vs, fs, transform_feedback_varyings=null){
  const v_shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(v_shader, vs);
  gl.compileShader(v_shader);
  const f_shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(f_shader, fs);
  gl.compileShader(f_shader);

  const program = gl.createProgram();
  gl.attachShader(program, v_shader);
  gl.attachShader(program, f_shader);

	if(transform_feedback_varyings){
		gl.transformFeedbackVaryings(
			program,
			transform_feedback_varyings,
			gl.INTERLEAVED_ATTRIBS
		);
	}

  gl.linkProgram(program);
  return program;
}

function createTexture(w, h, data=null){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w, h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	
	return t;
}

function createSingleChannelTexture(w, h, data=null){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R8,
    w, h,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	return t;
}

function createTextureFromCanvas(w, h, text){
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = w;
  ctx.canvas.height = h;

	const lineWidth = 100;
	const count = h / lineWidth;
	const step = lineWidth * 2;

  ctx.fillStyle = '#ddd';
	ctx.fillRect(0, 0, w, h);
	
	ctx.fillStyle = '#666';
	ctx.save();
	ctx.rotate(-0.785);
	for (let i = 0; i < count; i++) {
	  ctx.fillRect(-w, i * step, w * 3, lineWidth);
	}
  ctx.restore();

  ctx.font = `${Math.floor(h*0.33)}px sans-serif`;
	ctx.fontWeight = 1000;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
	ctx.save();
  ctx.scale(1, -1);
  ctx.fillStyle = "black";
  ctx.fillText(text, w / 2, -h / 2);
	ctx.restore();
  return ctx.canvas;
}

function createVAO(program, attrs){
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	for(const name in attrs){
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(attrs[name]),
			gl.STATIC_DRAW
		);
		const location = gl.getAttribLocation(program, name);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
	}

	return vao;
}

function createBuffer(data){
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
		data,
    gl.STREAM_DRAW
  );

  return buffer;
}

function createVAOfromBuffer(program, buffer_opts){
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer_opts.buffer);

  let offset = 0;
  const attribs = buffer_opts.attributes;
  for(const attr in attribs){
		const location = gl.getAttribLocation(program, attr);
		gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
			location,
      attribs[attr].num_components,
      gl.FLOAT,
      false,
      buffer_opts.stride,
      offset
    );
    const type_size = 4;

    offset += attribs[attr].num_components * type_size;
  }
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vao;
}

function createFramebuffer(tex){
	const f = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, f);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		tex,
		0
	);
	return f;
}


function glEnumToString(gl, value) {
  for (let key in gl) {
    if (gl[key] === value) {
      return key;
    }
  }
  return `0x${value.toString(16)}`;
}

function getErrors(gl) {
	const errors = gl.getError()
	if(errors > 0) {
		console.log(glEnumToString(gl, errors))
	}
}


function log(...args) {
  const elem = document.createElement("pre");
  elem.textContent = [...args].join(' ');
  document.body.appendChild(elem);
}

function readPixelsFromBuffer(x, y, w, h, attachment) {
  gl.readBuffer(attachment);
  const data = new Float32Array(4 * w * h);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.FLOAT, data);
  log(glEnumToString(gl, attachment), data);

	return data
}

function initVideo() {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;
      })
      .catch(function (error) {
        console.log('Something went wrong with the webcam...');
      });
  }
}

function stopVideo(e) {
  const stream = video.srcObject;
  const tracks = stream.getTracks();

  for (let i = 0; i < tracks.length; i++) {
    tracks[i].stop();
  }

  video.srcObject = null;
}

function createData(w, h){
	let d = [];
	for(let i=0; i<w; i++){
		for(let j=0; j<h; j++){
			let idx = (i + j * w) * 4;
			d[idx  ] = i^j;
			d[idx+1] = i^j;
			d[idx+2] = i|j;
			d[idx+3] = 255;
		}
	}
	return d;
}

function randomData(w, h){
	let d = [];
	for(let i=0; i<w; i++){
		for(let j=0; j<h; j++){
			let idx = (i + j * w) * 4;
			d[idx  ] = Math.random() * 255 - 128
			d[idx+1] = Math.random() * 255 - 128
			d[idx+2] = Math.random() * 255 - 128
			d[idx+3] = Math.random() * 255 - 128
		}
	}
	return d;
}

function getRes(){
  return {
    x : window.innerWidth,
    y : window.innerHeight,
  }
}

function drop(x, y){
  gl.bindTexture(gl.TEXTURE_2D, textures[(count+0)%3]);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0, x, y,
    1, 1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255,255,255,255])
  );
}

