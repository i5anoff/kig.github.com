(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

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
		return gl.getUniformLocation(p, name);
	};
	var u4fv = function(gl, p, name, v) {
		gl.uniform4fv(getUniform(gl, p, name), v);
	};
	var u3f = function(gl, p, name, x,y,z) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z);
	};
	var u1f = function(gl, p, name, x) {
		gl.uniform1f(getUniform(gl, p, name), x);
	};
	var u1i = function(gl, p, name, x) {
		gl.uniform1i(getUniform(gl, p, name), x);
	};

	Loader.get(shaderURLs, function() {
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(4*16*2);
		posTex.width = 16;
		posTex.height = 2;
		for (var i=0; i<posTex.length; i+=4) {
			posTex[i] = (i/4-8)*2;
			posTex[i+1] = (i/4-8)*2;
			posTex[i+2] = (i/4-8)*2;
			posTex[i+3] = Math.max(1, i/4);
		}
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');

		var resize = function() {
			glc.width = window.innerWidth;
			glc.height = window.innerHeight;
			gl.viewport(0,0, glc.width, glc.height);
			u3f(gl, p, 'iResolution', glc.width, glc.height, 1.0);
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
			u3f(gl, p, 'iResolution', glc.width, glc.height, 1.0);
			u1i(gl, p, 'iChannel0', 0);
			u1i(gl, p, 'iChannel1', 1);
			var pos = gl.getAttribLocation(p, 'position');
			gl.enableVertexAttribArray(pos);
			gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);
		};
		for (var i=0; i<arguments.length; i++) {
			var el = document.createElement('li');
			el.innerHTML = i+1;
			el.onclick = function(ev) {
				setShader(parseInt(this.innerHTML)-1);
				ev.preventDefault();
			};
			sel.appendChild(el);
			shaders.push(arguments[i]);
		}
		setShader(currentShader);


		var t = 0;
		var targetRot = 0;
		var targetOpen = 0;
		var mouse = new Float32Array(4);
		var iRot = 0;
		var iOpen = 0;

		glc.onmousedown = function(ev) {
			mouse[2] = ev.layerX;
			mouse[3] = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			ev.preventDefault();
		};
		glc.onmouseup = function(ev) {
			mouse[2] = -1;
			mouse[3] = -1;
			targetOpen = targetOpen ? 0 : 1;
			ev.preventDefault();
		};
		glc.onmousemove = function(ev) {
			mouse[0] = ev.layerX;
			mouse[1] = this.offsetHeight-ev.layerY;
		};
		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};
		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var cameraPos = new Float32Array(4); // xyz, roll angle
		var cameraPosV = new Float32Array(4); // xyz, roll angle
		var cameraTarget = new Float32Array(4); // xyz, zoom
		var cameraTargetV = new Float32Array(4); // xyz, zoom
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var dt = 16/1000;
		var tick = function() {
			if (!blurred) {
				if (window.startScript) {
					if (window.performance && performance.timing && performance.timing.navigationStart) {
						console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
					}
					console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
					window.startScript = 0;
				}
				t += 16;
				iRot += (targetRot - iRot) * 0.1;
				if (Math.abs(targetRot-iRot) < 0.01) {
					iRot = targetRot;
					iOpen += (targetOpen - iOpen) * 0.15;
					if (Math.abs(targetOpen - iOpen) < 0.01) {
						iOpen = targetOpen;
					}
				}
				for (j=0; j<9; j++) {
					i = j*4;
					x0 = posTex[i];
					y0 = posTex[i+1];
					z0 = posTex[i+2];
					r0 = posTex[i+3];
					posTex[i] = Math.sin(i/3+t/2000)*16;
					posTex[i+1] = (16-i)*1.2;
					posTex[i+2] = Math.cos(i/3+t/2000)*16;
					//posTex[i+3] = 1.9+1.7*Math.sin(i/4+t/100);
					posTex[i+16*4] = (posTex[i]-x0)/dt;
					posTex[i+16*4+1] = (posTex[i+1]-y0)/dt;
					posTex[i+16*4+2] = (posTex[i+2]-z0)/dt;
					posTex[i+16*4+3] = (posTex[i+3]-r0)/dt;
				}
				cx0 = cameraPos[0];
				cy0 = cameraPos[1];
				cz0 = cameraPos[2];
				cameraPos[0] = 30; //Math.sin(t/1500)*30;
				cameraPos[1] = 0; //Math.sin(t/2500)*10;
				cameraPos[2] = 30; //Math.cos(t/1500)*30;
				cameraPosV[0] = (cameraPos[0]-cx0)/dt;
				cameraPosV[1] = (cameraPos[1]-cy0)/dt;
				cameraPosV[2] = (cameraPos[2]-cz0)/dt;
				cameraTarget[1] = 0;
				cameraTarget[3] = 1;

				u1f(gl, p, 'iGlobalTime', t/1000);
				u1f(gl, p, 'iRot', iRot);
				u1f(gl, p, 'iOpen', iOpen);
				u4fv(gl, p, 'iMouse', mouse);
				u4fv(gl, p, 'iCamera', cameraPos);
				u4fv(gl, p, 'iCameraTarget', cameraTarget);
				u4fv(gl, p, 'iCameraV', cameraPosV);
				u4fv(gl, p, 'iCameraTargetV', cameraTargetV);
				updateTexture(gl, pTex, posTex, 1);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}	
			requestAnimationFrame(tick, glc);
		};
		resize();
		tick();
		document.body.appendChild(glc);
		document.querySelector('#shaders').style.opacity = 1;
	});
};
var ticker = function() {
	if (window.gl) init();
	else setTimeout(ticker, 0);
};
ticker();
})();

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = "//connect.soundcloud.com/sdk.js";
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
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
					onfinish: self.onstop.bind(self),
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

	var ticks = 0;
	var sctick = function() {
		if (window.SC) {
			SC.initialize({
			    client_id: "7edc86ef9d085d9b071f1c1b7199a205"
			});
			window.scplayer = new SCPlayer("/tracks/40512091", document.getElementById('music'));			
		} else if (ticks < 100) {
			ticks++;
			setTimeout(sctick, 100);
		}
	};
	sctick();
})();

