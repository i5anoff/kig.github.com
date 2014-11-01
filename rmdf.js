(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

	if (/Windows/.test(navigator.userAgent)) {
		var ok = confirm("This page doesn't really work on DirectX-based WebGL. Try anyway?");
		if (!ok) {
			return;
		}
	}

	window.requestAnimationFrame || (window.requestAnimationFrame = 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function(callback, element) {
			return window.setTimeout(function() {
				callback(Date.now());
			}, 1000 / 60);
		}
	);

	window.showPopup = function(title, content, x, y) {
		var popup = document.getElementById('popup');
		var cx = window.innerWidth / 2;
		var cy = window.innerHeight / 2;
		var dx = x - cx;
		var dy = y - cy;
		popup.style.left = x + 'px';
		popup.style.top = y + 'px';
		popup.classList.add('visible');
		popup.querySelector('.close').onclick = hidePopup;
		popup.querySelector('h2').textContent = title;
		popup.querySelector('.content').innerHTML = content;
	};

	window.hidePopup = function() {
		var popup = document.getElementById('popup');
		popup.classList.remove('visible');		
	};


	var createTexture = function(gl, buf, unit) {
		gl.activeTexture( gl.TEXTURE0+(unit||0) );
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		if (buf instanceof Float32Array) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.FLOAT, buf);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		return tex;
	};
	var updateTexture = function(gl, tex, buf, unit) {
		gl.activeTexture( gl.TEXTURE0+(unit||0) );
		gl.bindTexture(gl.TEXTURE_2D, tex);
		if (buf instanceof Float32Array) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.FLOAT, buf);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		}
	};
	var createBuffer = function(gl) {
		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		var arr = new Float32Array([
			-1,-1, 0,
			 1,-1, 0,
			 1, 1, 0,
			-1,-1, 0,
			 1, 1, 0,
			-1, 1, 0
		]);
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
		return buf;
	};
	var createShader = function(gl, source, type) {
		var s = source;
		if (typeof source === 'string') {
			s = gl.createShader(type);
			gl.shaderSource(s, source);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(s));
			}
		}
		return s;
	};
	var createProgram = function(gl, vert, frag) {
		var t0 = Date.now();
		var p = gl.createProgram();
		var vs = createShader(gl, vert, gl.VERTEX_SHADER);
		var fs = createShader(gl, frag, gl.FRAGMENT_SHADER);
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);
		gl.linkProgram(p);
		if (DEBUG) console.log('Create program: '+(Date.now()-t0)+' ms');
		return p;
	};
	var getUniform = function(gl, p, name) {
		if (!p.uniforms) p.uniforms = {};
		if (!p.uniforms[name]) p.uniforms[name] = gl.getUniformLocation(p, name);
		return p.uniforms[name];
	};
	var u4fv = function(gl, p, name, v) {
		gl.uniform4fv(getUniform(gl, p, name), v);
	};
	var u3fv = function(gl, p, name, v) {
		gl.uniform3fv(getUniform(gl, p, name), v);
	};
	var u2fv = function(gl, p, name, v) {
		gl.uniform2fv(getUniform(gl, p, name), v);
	};
	var u4f = function(gl, p, name, x,y,z,w) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z,w);
	};
	var u3f = function(gl, p, name, x,y,z) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z);
	};
	var u2f = function(gl, p, name, x,y) {
		gl.uniform2f(getUniform(gl, p, name), x,y);
	};
	var u1f = function(gl, p, name, x) {
		gl.uniform1f(getUniform(gl, p, name), x);
	};
	var u1i = function(gl, p, name, x) {
		gl.uniform1i(getUniform(gl, p, name), x);
	};

	var Vec3 = function(x,y,z) {
		var v = new Float32Array(3);
		x = x || 0;
		v[0] = x;
		v[1] = y || x;
		v[2] = z || x;
		return v;
	};

	var rc = Vec3(0.0);
	var raySphere = function(ro, rd, cen, r, idx, hit) {
		vec3.sub(rc, ro,cen);
		var c = vec3.dot(rc,rc);
		c -= r*r;
		var b = vec3.dot(rd, rc);
		var d = b*b - c;
		var t = -b - Math.sqrt(Math.abs(d));
		if (t > 0 && d > 0 && t < hit.dist) {
			hit.dist = t;
			hit.pick = idx;
		}
	};
	var traceTmp = Vec3(0.0);
	var trace = function(ro, rd, posTex) {
		var hit = {
			dist: 1e7,
			pick: -2
		};
		for (var i=0; i<16; i++) {
			var off = i*20;
			if (posTex[off+19] === 0) {
				continue;
			}
			traceTmp[0] = -posTex[off+16];
			traceTmp[1] = -posTex[off+17];
			traceTmp[2] = -posTex[off+18];
			var r = posTex[off];
			raySphere(ro, rd, traceTmp, r, i, hit);
		}
		return hit;
	};

	var up = Vec3(0.0, 1.0, 0.0);
	var uvd = Vec3(0.0);
	var cameraMat = mat3.create();
	var xaxis = new Float32Array(cameraMat.buffer, 0, 3);
	var yaxis = new Float32Array(cameraMat.buffer, 3*4, 3);
	var zaxis = new Float32Array(cameraMat.buffer, 2*3*4, 3);
	var getDir = function(iResolution, cameraPos, cameraTarget, fragCoord, dir) {
		uvd[0] = (-1.0 + 2.0*fragCoord[0]/iResolution[0]) * (iResolution[0]/iResolution[1]);
		uvd[1] = -1.0 + 2.0*fragCoord[1]/iResolution[1];
		uvd[2] = 1.0;
		vec3.normalize(uvd, uvd);
		vec3.normalize(zaxis, vec3.sub(zaxis, cameraTarget, cameraPos));
		vec3.normalize(xaxis, vec3.cross(xaxis, up, zaxis));
		vec3.normalize(yaxis, vec3.cross(yaxis, zaxis, xaxis));
		vec3.transformMat3(dir, uvd, cameraMat);
		return dir;
	};




	// Distance field renderer objects
	DF = {};
	DF._tmpVec = Vec3(0.0);
	DF._tmpMatrix = mat4.create();
	DF.mergeBoundingSpheres = function(s1, s2) {
		var a = s1, b = s2;
		if (b.radius > a.radius) {
			a = s2, b = s1;
		}
		var s = {center: Vec3(0.0), radius: 0};
		var v = this._tmpVec;
		vec3.sub(v, a, b);
		var distance = vec3.length(v);
		if (distance + b.radius <= a.radius) {
			return a;
		}
		var f = b.radius / a.radius;
		vec3.scale(v, v, 0.5 * f);
		s.radius = a.radius + b.radius * f;
		s.center.set(v);
		return s;
	};

	DF.testMerge = function() {
		var s1 = {center: [0,0,0], radius: 1};
		var s2 = {center: [1,0,0], radius: 0.5};
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.25) > 1e-5 && Math.abs(m.radius - 1.25) > 1e-5) {
			console.log("Error with partial overlap merge");
		}
		s2.center[0] = 0.25;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap a>b merge");
		}
		var m = DF.mergeBoundingSpheres(s2, s1);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap b>a merge");
		}
		s2.center[0] = 2;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with no overlap merge");
		}
		s2.center[0] = 3;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.5) > 1e-5 && Math.abs(m.radius - 2.5) > 1e-5) {
			console.log("Error with separated no overlap merge");
		}
		s2.center[0] = 3;
		s2.radius = 1e-7;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 2.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with separated no overlap merge, point");
		}
	};
	DF.testMerge();

	DF.Types = {
		Sphere: 1,
		Box: 2,
		Torus: 3,
		Plane: 4,

		empty: 0
	};
	DF.typeNames = {};
	(function() {
		for (var i in DF.Types) {
			DF.typeNames[DF.Types[i]] = i;
		}
	})();

	DF.Material = function(options) {
		this.bufferArray = new Float32Array(8);
		this.transmit = new Float32Array(this.bufferArray.buffer, 0, 3);
		this.emit = new Float32Array(this.bufferArray.buffer, 4*4, 3);
		this.diffuse = 0.0;
		if (options) {
			for (var i in options) {
				if (this[i] && this[i].byteLength) { // Typed Array
					this[i].set(options[i]);
				} else {
					this[i] = options[i];
				}
			}
		}
	};
	DF.Material.prototype.write = function(array, offset) {
		this.bufferArray[7] = this.diffuse;
		array.set(this.bufferArray, offset);
	};

	DF.Object = function(options) {
		this.title = "";
		this.content = "";
		this.bufferArray = new Float32Array(4 /* Object info */ + 16 /* Transform matrix */);
		this.buffer = this.bufferArray.buffer;
		this.matrix = new Float32Array(this.buffer, 4*4, 16);
		mat4.identity(this.matrix);
		this.position = new Float32Array(this.buffer, 4 * ( 4+12 ), 3); // Last row of transform matrix.
		this.material = new DF.Material();
		this.materialIndex = 0;
		this.type = DF.Types.empty;
		this.boundingSphere = {center: this.position, radius: 0};
		if (options) {
			for (var i in options) {
				if (this[i] && this[i].byteLength) { // Typed Array
					this[i].set(options[i]);
				} else {
					this[i] = options[i];
				}
			}
		}
	};
	DF.Object.prototype.tick = function() {};
	DF.Object.prototype.write = function(array, offset) {
		mat4.copy(DF._tmpMatrix, this.matrix);
		mat4.invert(this.matrix, DF._tmpMatrix);
		this.bufferArray[19] = (this.type << 8) | this.materialIndex;
		array.set(this.bufferArray, offset);
		mat4.copy(this.matrix, DF._tmpMatrix);
	};
	DF.Object.prototype.computeBoundingSphere = function() {
		return this.boundingSphere;
	};

	DF.Sphere = function(options) {
		this.radius = 1;
		DF.Object.call(this, options);
		this.type = DF.Types.Sphere;
		this.computeBoundingSphere();
	};
	DF.Sphere.prototype = Object.create(DF.Object.prototype);
	DF.Sphere.prototype.write = function(array, offset) {
		this.bufferArray[0] = this.radius;
		DF.Object.prototype.write.call(this, array, offset);
	};
	DF.Sphere.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = this.radius;
		return this.boundingSphere;
	};

	DF.Box = function(options) {
		DF.Object.call(this, options);
		this.dimensions = new Float32Array(this.buffer, 0, 3);
		this.dimensions.set((options && options.dimensions) || [1,1,1]);
		this.type = DF.Types.Box;
		if (this.cornerRadius === undefined) {
			this.cornerRadius = 0.05;
		}
		this.computeBoundingSphere();
	};
	DF.Box.prototype = Object.create(DF.Object.prototype);
	DF.Box.prototype.write = function(array, offset) {
		this.bufferArray[3] = this.cornerRadius;
		DF.Object.prototype.write.call(this, array, offset);
	};
	DF.Box.prototype.computeBoundingSphere = function() {
		var r = Math.max.apply(null, this.dimensions);
		this.boundingSphere.radius = r;
		return this.boundingSphere;
	};


	Loader.get(shaderURLs, function() {
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(16*8 * 2 * 4);
		posTex.width = 16 * 8;
		posTex.height = 2;
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');
		var iResolution = Vec3(glc.width, glc.height, 1.0);

		var controller = new DF.Box({position: [0.1, 0.1, 0.1], dimensions: [0.1, 0.1, 0.1]});
		controller.objects = [];
		controller.objectCount = 0;
		controller.setCurrent = function() {};

		window.rmdfController = controller;

		controller.skybox = {
			lightPos: Vec3(-5.1),
			sunColor: [1, 0.8, 0.5].map(function(v){ return v*255; }),
			skyColor: [0.25, 0.5, 0.5].map(function(v){ return v*255; }),
			groundColor: [0.2, 0.1, 0.1].map(function(v){ return v*255; }),
			horizonColor: [1, 0.8, 0.5].map(function(v){ return v*255; })
		};

		controller.camera = {
			ISO: 100,
			exposureCompensation: 0,
			shutterSpeed: 1/60,
			position: Vec3(0.0),
			target: Vec3(0.0)
		};

		var phi = 0;
		var theta = 0;

		var parseColor = function(c){
			if (/^#......$/.test(c)) {
				var a = [];
				a.push(parseInt(c.substr(1,2), 16));
				a.push(parseInt(c.substr(3,2), 16));
				a.push(parseInt(c.substr(5,2), 16));
				return a;
			} else {
				return JSON.parse('['+c+']').map(function(v) { return v * 255; });
			}
		};

		var parseColorF = function(c){
			return parseColor(c).map(function(v) { return v / 255; });
		};

		var rmdfScene = document.querySelector('rmdf-scene');
		if (rmdfScene) {
			if (rmdfScene.hasAttribute('sun-color')) { controller.skybox.sunColor = parseColor(rmdfScene.getAttribute('sun-color')); }
			if (rmdfScene.hasAttribute('sky-color')) { controller.skybox.skyColor = parseColor(rmdfScene.getAttribute('sky-color')); }
			if (rmdfScene.hasAttribute('ground-color')) { controller.skybox.groundColor = parseColor(rmdfScene.getAttribute('ground-color')); }
			if (rmdfScene.hasAttribute('horizon-color')) { controller.skybox.horizonColor = parseColor(rmdfScene.getAttribute('horizon-color')); }
			if (rmdfScene.hasAttribute('sun-position')) { controller.skybox.lightPos.set(JSON.parse('['+rmdfScene.getAttribute('sun-position')+']')); }
			if (rmdfScene.hasAttribute('camera-position')) { controller.camera.position.set(JSON.parse('['+rmdfScene.getAttribute('camera-position')+']')); }
			if (rmdfScene.hasAttribute('camera-target')) { controller.camera.target.set(JSON.parse('['+rmdfScene.getAttribute('camera-target')+']')); }
			if (rmdfScene.hasAttribute('camera-iso')) { controller.camera.ISO = parseFloat(rmdfScene.getAttribute('camera-iso')); }
			if (rmdfScene.hasAttribute('camera-exposure-compensation')) { controller.camera.exposureCompensation = parseFloat(rmdfScene.getAttribute('camera-exposure-compensation')); }
			if (rmdfScene.hasAttribute('camera-shutter-speed')) { controller.camera.shutterSpeed = parseFloat(rmdfScene.getAttribute('camera-shutter-speed')); }
			var cc = rmdfScene.childNodes;
			for (var i=0; i<cc.length; i++) {
				var c = cc[i];
				var options = {};
				options.material = new DF.Material();
				if (c.hasAttribute) {
					if (c.querySelector('title')) { options.title = c.querySelector('title').textContent; }
					if (c.querySelector('content')) { options.content = c.querySelector('content').innerHTML; }
					if (c.hasAttribute('position')) { options.position = JSON.parse('['+c.getAttribute('position')+']'); }
					if (c.hasAttribute('material-transmit')) { options.material.transmit.set(parseColorF(c.getAttribute('material-transmit'))); }
					if (c.hasAttribute('material-diffuse')) { options.material.diffuse = parseFloat(c.getAttribute('material-diffuse')); }
					if (c.hasAttribute('material-emit')) { options.material.emit.set(parseColorF(c.getAttribute('material-emit'))); }
					if (c.querySelector('onclick')) { 
						options.onclickString = c.querySelector('onclick').textContent;
						options.onclick = new Function('ev', options.onclickString);
					}
					if (c.querySelector('ontick')) { 
						options.ontickString = c.querySelector('ontick').textContent;
						options.ontick = new Function('ev', options.ontickString);
					}
				}
				switch (c.tagName) {
					case 'RMDF-BOX':
						if (c.hasAttribute('dimensions')) { options.dimensions = JSON.parse('['+c.getAttribute('dimensions')+']'); }
						if (c.hasAttribute('corner-radius')) { options.cornerRadius = parseFloat(c.getAttribute('corner-radius')); }
						controller.objects[controller.objectCount++] = new DF.Box(options);
						break;
					case 'RMDF-SPHERE':
						if (c.hasAttribute('radius')) { options.radius = parseFloat(c.getAttribute('radius')); }
						controller.objects[controller.objectCount++] = new DF.Sphere(options);
						break;
				}
			}
		}

		var cv = vec3.sub(Vec3(0.0), controller.camera.position, controller.camera.target);
		controller.cameraDistance = vec3.length(cv);
		phi = Math.atan2(cv[2], cv[0]);
		theta = Math.acos(cv[1]/controller.cameraDistance);

		var resize = function() {
			glc.width = window.innerWidth * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			glc.height = window.innerHeight * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			iResolution[0] = glc.width;
			iResolution[1] = glc.height;
			gl.viewport(0,0, glc.width, glc.height);
			u3fv(gl, p, 'iResolution', iResolution);
		};

		var p;
		var sel = document.body.querySelector('#shaders');
		var shaders = [];
		var currentShader = 0;
		var rtVert = 'precision highp float;attribute vec3 position;void main() {gl_Position = vec4(position, 1.0);}';
		var rtShader = createShader(gl, rtVert, gl.VERTEX_SHADER);
		var setShader = function(idx) {
			currentShader = idx;
			p = shaders[currentShader];
			if (typeof p === 'string') {
				p = shaders[currentShader] = createProgram(gl, rtShader, p);
			}
			gl.useProgram(p);
			startT = Date.now();
			targetRot = targetOpen = iRot = iOpen = 0;
			u3fv(gl, p, 'iResolution', iResolution);
			u1i(gl, p, 'iChannel0', 0);
			u1i(gl, p, 'iChannel1', 1);
			var pos = gl.getAttribLocation(p, 'position');
			gl.enableVertexAttribArray(pos);
			gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);
		};
		for (var i=0; i<arguments.length; i++) {
			if (sel) {
				var el = document.createElement('li');
				el.innerHTML = i+1;
				el.onclick = function(ev) {
					setShader(parseInt(this.innerHTML)-1);
					ev.preventDefault();
				};
				sel.appendChild(el);
			}
			shaders.push(arguments[i]);
		}
		setShader(currentShader);


		var t = 0;
		var mouse = new Float32Array(4);

		var tDown = 0;

		var down = false;
		var clickEvent = false;
		var startX, startY;
		var cancelClick = false;

		document.querySelector('#edit').onclick = function(ev) {
			ev.preventDefault();
			document.body.classList.toggle('editmode');
		};

		glc.onmousedown = function(ev) {
			cancelClick = false;
			startX = mouse[2] = ev.layerX;
			startY = mouse[3] = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			down = true;
			tDown = t;
			ev.preventDefault();
		};
		glc.onclick = function(ev) {
			if (!cancelClick) {
				clickEvent = ev;
			} else {
				clickEvent = false;
			}
			cancelClick = false;
		};
		glc.onmouseup = function(ev) {
			mouse[2] = -1;
			mouse[3] = -1;
			targetOpen = targetOpen ? 0 : 1;
			down = false;
			ev.preventDefault();
		};
		glc.onmousemove = function(ev) {
			mouse[0] = ev.layerX;
			mouse[1] = this.offsetHeight-ev.layerY;
			var dx = mouse[0]-startX;
			var dy = mouse[1]-startY;
			if ((dx*dx + dy*dy) > 5*5) {
				cancelClick = true;
			}
			if (down) {
				var dx = mouse[2] - mouse[0];
				var dy = mouse[3] - mouse[1];
				theta -= 0.01 * dy;
				if (theta > Math.PI) theta = Math.PI;
				if (theta < 0.001) theta = 0.001; // Avoid camera singularity at 0. Probably screwy upvector.
				phi += 0.01 * dx;
				controller.camera.position[0] = controller.cameraDistance * Math.sin(theta) * Math.cos(phi);
				controller.camera.position[1] = controller.cameraDistance * Math.cos(theta);
				controller.camera.position[2] = controller.cameraDistance * Math.sin(theta) * Math.sin(phi);
				mouse[2] = mouse[0];
				mouse[3] = mouse[1];
			}
		};
		glc.addEventListener('mousewheel', function(ev) {
			controller.cameraDistance *= Math.pow(1.002, -ev.wheelDeltaY);
			if (controller.cameraDistance < 4) { controller.cameraDistance = 4 };
			if (controller.cameraDistance > 10) { controller.cameraDistance = 10 };
			controller.camera.position[0] = controller.cameraDistance * Math.sin(theta) * Math.cos(phi);
			controller.camera.position[1] = controller.cameraDistance * Math.cos(theta);
			controller.camera.position[2] = controller.cameraDistance * Math.sin(theta) * Math.sin(phi);
		}, false);
		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};
		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var bounce = function(ev) {
			ev.preventDefault();
			var self = this;
			var p = this.position[1];
			var t = 0;
			var ival = setInterval(function() {
				if (t > 1000) {
					t = 1000;
					clearInterval(ival);
				}
				self.position[1] = p + Math.abs(Math.sin((t/1000)*2*Math.PI));
				t += 16;
			}, 16);
		};

		controller.camera.position[0] = controller.cameraDistance * Math.sin(theta) * Math.cos(phi);
		controller.camera.position[1] = controller.cameraDistance * Math.cos(theta);
		controller.camera.position[2] = controller.cameraDistance * Math.sin(theta) * Math.sin(phi);
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var dt = 16/1000;
		var cdir = Vec3(0.0);
		var target = 3;
		var startT = Date.now();

		var sceneBoundingSphere = new Float32Array(4);

		var tick = function() {
			if (!blurred) {
				if (window.startScript) {
					if (window.performance && performance.timing && performance.timing.navigationStart) {
						console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
					}
					console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
					window.startScript = 0;
				}
				t = Date.now() - startT;

				var objects = controller.objects;
				while (objects.length < 16) {
					objects.push(new DF.Object());
				}
				var pick = -2.0;
				if (clickEvent) {
					getDir(iResolution, controller.camera.position, controller.camera.target, mouse, cdir);
					pick = trace(controller.camera.position, cdir, posTex).pick;
					if (pick >= 0) {
						controller.setCurrent(controller.objects[pick]);
						var o = objects[pick];
						if (o.title && o.content) {
							showPopup(o.title, o.content, glc.width/2 + (clickEvent.pageX > glc.width/2 ? 150 : -250), clickEvent.pageY);
						}
						if (o.onclick) {
							try {
								o.onclick(clickEvent);
							} catch(e){ console.log(e); }
						}
					} else {
						controller.setCurrent(null);
					}
					clickEvent = false;
				}
				for (var j=0; j<objects.length; j++) {
					objects[j].tick();
				}
				for (var j=0; j<objects.length; j++) {
					objects[j].materialIndex = j;
					objects[j].write(posTex, j*20);
					objects[j].material.write(posTex, posTex.width*4 + j*8);
				}
				var tx,ty,tz;
				tx = ty = tz = 0;
				var r = 30 + 100 * (0.5+0.5*Math.cos(Math.PI*Math.min(Math.max(0, t-1000), 1000)/1000));
				u3fv(gl, p, 'iCamera', controller.camera.position);
				u3fv(gl, p, 'iCameraTarget', controller.camera.target);

				var s = objects[0].computeBoundingSphere();
				for (var i=1; i<objects.length; i++) {
					s = DF.mergeBoundingSpheres(s, objects[i].computeBoundingSphere());
				}
				sceneBoundingSphere.set(s.center);
				sceneBoundingSphere[3] = s.radius;
				u4fv(gl, p, 'iBoundingSphere', sceneBoundingSphere);

				updateTexture(gl, pTex, posTex, 1);

				u3fv(gl, p, 'iLightPos', vec3.scale(DF._tmpVec, controller.skybox.lightPos, 1/255));
				u3fv(gl, p, 'iSunColor', vec3.scale(DF._tmpVec, controller.skybox.sunColor, 1/255));
				u3fv(gl, p, 'iSkyColor', vec3.scale(DF._tmpVec, controller.skybox.skyColor, 1/255));
				u3fv(gl, p, 'iGroundColor', vec3.scale(DF._tmpVec, controller.skybox.groundColor, 1/255));
				u3fv(gl, p, 'iHorizonColor', vec3.scale(DF._tmpVec, controller.skybox.horizonColor, 1/255));
				u1f(gl, p, 'iGlobalTime', t/1000);
				u1f(gl, p, 'iPick', pick);
				u1f(gl, p, 'iISO', controller.camera.ISO);
				u1f(gl, p, 'iShutterSpeed', controller.camera.shutterSpeed);
				u1f(gl, p, 'iExposureCompensation', controller.camera.exposureCompensation);
				u4fv(gl, p, 'iMouse', mouse);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}	
			requestAnimationFrame(tick, glc);
		};
		resize();
		tick();
		document.body.appendChild(glc);

		var sel = document.querySelector('#shaders');
		if (sel) {
			sel.style.opacity = 1;
		}
	});
};
var ticker = function() {
	if (window.gl && window.mat4) init();
	else setTimeout(ticker, 5);
};
ticker();
})();

