(function() {
	var SCPlayer = function(trackURL, el, params) {
		var self = this;
		this.trackURL = trackURL;
		this.el = el;
		SC.get(trackURL, function(track){
			self.title = track.title;
			self.url = track.permalink_url;
			self.artist = track.user.username;
			self.artistURL = track.user.permalink_url;
			self.track = track;
			self.initializeDOM();
		});
		for (var i in params) this[i] = params[i];
		this.initializeDOM();
	};

	SCPlayer.prototype.onpause = function() {
		this.play.innerHTML = '&#9654;';
	};

	SCPlayer.prototype.onstop = function() {
		this.play.innerHTML = '&#9654;';
	};

	SCPlayer.prototype.onplay = function() {
		this.play.innerHTML = '&#10073;&#10073;';
	};

	SCPlayer.prototype.initializeDOM = function() {
		var self = this;
		this.el.style.opacity = 0.3;
		this.play = this.el.querySelector('.music-play');
		this.linkEl = this.el.querySelector('.music-link');
		this.authorEl = this.el.querySelector('.music-author');
		this.titleEl = this.el.querySelector('.music-title');

		this.streaming = false;
		this.play.onclick = function() {
			if (!self.streaming) {
				self.streaming = true;
				self.play.innerHTML = '';
				var c = document.createElement('canvas');
				c.width = 40;
				c.height = 46;
				var ctx = c.getContext('2d');
				ctx.fillStyle = 'white';
				var tick = function() {
					ctx.clearRect(0,0,c.width,c.height);
					var r = c.width/2 - 6;
					var t = Date.now();
					ctx.save();
					ctx.translate(c.width/2, c.height/2);
					ctx.beginPath();
					ctx.arc(Math.sin(t/1000)*r, Math.cos(t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.beginPath();
					ctx.arc(Math.sin(Math.PI*(2/3)+t/1000)*r, Math.cos(Math.PI*(2/3)+t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.beginPath();
					ctx.arc(Math.sin(Math.PI*(4/3)+t/1000)*r, Math.cos(Math.PI*(4/3)+t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.restore();
					if (c.parentNode) {
						requestAnimationFrame(tick, c);
					}
				};
				self.play.appendChild(c);
				requestAnimationFrame(tick, c);
				SC.stream(self.trackURL, {
					autoPlay: true,
					onpause: self.onpause.bind(self),
					onplay: self.onplay.bind(self),
					onstop: self.onstop.bind(self)
				}, function(sound){
					self.sound = sound;
				});
			} else {
				self.sound.togglePause();
			}
		};
		self.authorEl.textContent = self.artist;
		self.authorEl.href = self.artistURL;
		self.titleEl.textContent = self.title;
		self.titleEl.href = self.url;
		self.linkEl.href = self.url;
	};

	SC.initialize({
	    client_id: "7edc86ef9d085d9b071f1c1b7199a205"
	});
	window.scplayer = new SCPlayer("/tracks/40512091", document.getElementById('music'));
})();

(function(){

	var legacy = /windows/i.test(navigator.userAgent);
	var mobile = /mobile/i.test(navigator.userAgent);
	if (mobile) {
		// This is a bit heavy on mobes.
		return;
	}

	/*
	var contact = document.getElementById('contact');

	document.getElementById('contact-link').onclick = function(ev){
		ev.preventDefault();
		if (contact.classList.contains('visible')) {
			contact.classList.remove('visible');
		} else {
			contact.classList.add('visible');
		}
	};
	 */

	var loadFiles = function(files, callback) {
		var results = [];
		var count = 0;
		for (var i=0; i<files.length; i++) {
			(function(i){
				var xhr = new XMLHttpRequest();
				xhr.open('GET', files[i]);
				xhr.onload = function(ev) {
					results[i] = this.responseText;
					count++;
					if (count === files.length) {
						callback.apply(null, results);
					}
				};
				xhr.send(null);
			})(i);
		}
		return results;
	};

	var canvas = document.createElement('canvas');
	canvas.width = canvas.height = 256;
	var id = canvas.getContext('2d').createImageData(256,256);
	for (var y=0; y<id.height; y++) {
		for (var x=0; x<id.width; x++) {
			var off = y*id.width + x;
			var off2 = ((y+17) % id.height)*id.width + ((x+37) % id.width);
			var v = Math.floor(256 * Math.random());
			id.data[off*4] = id.data[off2*4+1] = v;
			id.data[off*4+3] = 255;
		}
	}
	canvas.getContext('2d').putImageData(id, 0, 0);
/*
	var createTexture = function(gl, canvas) {
		gl.activeTexture( gl.TEXTURE0 );
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.generateMipmap(gl.TEXTURE_2D);
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
		gl.bufferData(gl.ARRAY_BUFFER, arr);
		return buf;
	};
*/


	var tex = new THREE.Texture(canvas);
	tex.wrapT = tex.wrapS = THREE.RepeatWrapping;
	tex.minFilter = THREE.LinearMipMapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.generateMipmaps = true;
	tex.flipY = false;
	tex.needsUpdate = true;	

	var plane;
	var renderer = new THREE.WebGLRenderer();
	var resize = function() {
		renderer.setSize(window.innerWidth, window.innerHeight);
		plane.material.uniforms.iResolution.value.x = renderer.domElement.width;
		plane.material.uniforms.iResolution.value.y = renderer.domElement.height;
	};
	document.body.appendChild(renderer.domElement);
	renderer.setClearColor(0xffffff);

	var shaderURLs = [
		'mblur.frag',
		(legacy ? 'zardoz_1999.frag' : 'zardoz_2001.frag')
	];

	loadFiles(['rt.vert'].concat(shaderURLs), function(rtVert) {
		var sel = document.body.querySelector('#shaders');
		var shaders = [];
		var currentShader = 0;
		var setShader = function(idx) {
			currentShader = idx;
			plane.material = shaders[currentShader];
		};
		for (var i=1; i<arguments.length; i++) {
			var el = document.createElement('li');
			el.innerHTML = i;
			el.onclick = function(ev) {
				setShader(parseInt(this.innerHTML)-1);
				ev.preventDefault();
			};
			sel.appendChild(el);
			shaders.push(new THREE.ShaderMaterial({
				attributes: {},
				uniforms: {
					iChannel0: {type: "t", value: tex},
					iGlobalTime: { type: "f", value: 0 },
					iRot: { type: "f", value: 0 },
					iRot2: { type: "f", value: 0 },
					iOpen: { type: "f", value: 0 },
					iResolution: { type: "v3", value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1.0) },
					iMouse: { type: "v4", value: new THREE.Vector4(-1, -1, -1, -1) }
				},
				vertexShader: rtVert,
				fragmentShader: arguments[i]
			}));
		}
		var scene = new THREE.Scene();
		var camera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
		scene.add(camera);
		plane = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 1, 1), shaders[currentShader]
		);
		scene.add(plane);
		if (legacy) {
			// toss in a thing of some sort.
		}

		var sin = Math.sin;
		var cos = Math.cos;
		var getCenter = function(time, k, i, n) {
			var m = 1.0;
			time *= 0.3;
			var r = 20.0;
			if (n == 0.0) {
				r = 0.0;
			}
			var v = new THREE.Vector3(
				-80.0+sin(m*2.0+time) * (-100.0+sin(time*0.4+m)*40.0 + 
							 sin(time+n*(6.28/3.0))*r + 4.0*sin(m+n+i+4.0*time)+(i)*5.0),
				-40.0+(m)*30.0 - cos(time+n*(6.28/3.0))*r - cos(i)*9.0 + k*2.5,
				2.0+cos(m*2.0+time) * (-cos(time*0.2+m)*28.0 + (n)*9.0 + sin(i)*9.0)
			);
			v.r = 1.0;
			return v;
		};

		var t = 0;
		var targetRot = 0;
		var targetOpen = 0;

		renderer.domElement.onmousedown = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.z = ev.layerX;
			m.value.w = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			//renderer.render(scene, camera);
		};
		renderer.domElement.onmouseup = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.z = -1;
			m.value.w = -1;
			targetOpen = targetOpen ? 0 : 1;
			//renderer.render(scene, camera);
		};
		renderer.domElement.onmousemove = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.x = ev.layerX;
			m.value.y = this.offsetHeight-ev.layerY;
		};
		window.onresize = function() {
			resize();
		};

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};

		var tick = function() {
			if (!blurred) {
				var r = plane.material.uniforms.iRot;
				r.value += (targetRot - r.value) * 0.1;
				if (Math.abs(targetRot-r.value) < 0.01) {
					r.value = targetRot;
					var r = plane.material.uniforms.iOpen;
					r.value += (targetOpen - r.value) * 0.15;
					if (Math.abs(targetOpen - r.value) < 0.01) {
						r.value = targetOpen;
						if (r.value === 1) {
							plane.material.uniforms.iRot2.value += 0.01;
						}
					}
				}
				plane.material.uniforms.iGlobalTime.value = t;
				renderer.render(scene, camera);
				t += 0.016;
			}
			requestAnimationFrame(tick, renderer.domElement);
		};
		resize();
		tick();
	});
})();
