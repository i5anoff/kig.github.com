
var renderer = new THREE.WebGLRenderer({antialias: true});
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 35, renderer.domElement.width / renderer.domElement.height, 1, 10000 );
camera.position.z = 120;
camera.position.y = 12;
var zero = new THREE.Vector3(0,24,20);
camera.lookAt(zero);
scene.add(camera);

var bgVert = document.querySelector('#bg-vert').textContent;
var bgFrag = document.querySelector('#bg-frag').textContent;

var id = new Uint8Array(256*256*4);
id.width=256;
id.height=256;
for (var y=0; y<256; y++) {
	for (var x=0; x<256; x++) {
		var off = (y*256 + x) | 0;
		var off2 = (((y+17) % 256)*256 + ((x+37) % 256)) | 0;
		var v = (256 * Math.random()) | 0;
		id[off*4] = id[off2*4+1] = v;
		id[off*4+2] = (256 * Math.random()) | 0;
		id[off*4+3] = (256 * Math.random()) | 0;
	}
}
var tex = new THREE.DataTexture(id, id.width, id.height,
	THREE.RGBAFormat, THREE.UnsignedByteType,
	THREE.Texture.DEFAULT_MAPPING,
	THREE.RepeatWrapping, THREE.RepeatWrapping
);
tex.flipY = false;
tex.needsUpdate = true;

var bgScene = new THREE.Scene();
var shaderMat = new THREE.ShaderMaterial({
	attributes: {},
	uniforms: {
		ufGlobalTime: { type: "f", value: 0 },
		uv2Resolution: { type: "v2", value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height) },
		um4CameraMatrix: { type: "m4", value: new THREE.Matrix4() },
		uv3CameraPosition: { type: "v3", value: new THREE.Vector3() },
		ufSunPosition: { type: "f", value: 0 },
		ufCloudCover: { type: "f", value: 0 },
		ufRainAmount: { type: "f", value: 0 },
		ufWindDirection: { type: "f", value: 0 },
		ufWindStrength: { type: "f", value: 0 },
		usRandomTex: { type: "t", value: tex }
	},
	depthTest: false,
	depthWrite: false,
	fog: false,
	vertexShader: bgVert,
	fragmentShader: bgFrag
});
var bgCamera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
bgScene.add(bgCamera);
var bgPlane = new THREE.Mesh(
	new THREE.PlaneBufferGeometry(2, 2, 1, 1), shaderMat
);
bgScene.add(bgPlane);

scene.add(cornMesh);
scene.add(rainMesh);
scene.add(birds);

window.onresize = function() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = renderer.domElement.width / renderer.domElement.height;
	camera.updateProjectionMatrix();
	shaderMat.uniforms.uv2Resolution.value.x = renderer.domElement.width;
	shaderMat.uniforms.uv2Resolution.value.y = renderer.domElement.height;
};

window.onmousemove = function(ev) {
	var x,y,w,h;
	x = ev.pageX;
	y = ev.pageY;
	w = window.innerWidth;
	h = window.innerHeight;
	//camera.position.x = (x - w/2) / (w/2) * 20;
	//camera.position.y = (y - h/2) / (h/2) * 20 + 30;
	//camera.lookAt(zero);
};

var clicked = false;
window.onclick = function(ev) {
	clicked = true;
}

var matrix = new THREE.Matrix4();

for (var i in shaderMat.uniforms) {
	cornShaderMat.uniforms[i] = shaderMat.uniforms[i];
}

cornShaderMat.uniforms.ufGlobalTime = rainShaderMat.uniforms.ufGlobalTime = shaderMat.uniforms.ufGlobalTime;

cornShaderMat.uniforms.ufWindDirection = rainShaderMat.uniforms.ufWindDirection;
cornShaderMat.uniforms.ufWindStrength = rainShaderMat.uniforms.ufWindStrength;
shaderMat.uniforms.ufRainAmount = rainShaderMat.uniforms.ufRainAmount;

scene.add(particles);

renderer.autoClear = false;

var animationTime = 0;

var tick = function() {
	matrix.multiplyMatrices( camera.matrixWorld, matrix.getInverse( camera.projectionMatrix ) );

	shaderMat.uniforms.ufGlobalTime.value = animationTime;
	shaderMat.uniforms.um4CameraMatrix.value = matrix;
	shaderMat.uniforms.uv3CameraPosition.value = camera.position;

	setWeather();
	updateParticles();
	birdsTick();
	impactTick();

	camera.lookAt(zero);

	animationTime += 0.016;
	renderer.clear();
	renderer.render(bgScene, bgCamera);
	renderer.render(scene, camera);
	requestAnimationFrame(tick, renderer.domElement);
	clicked = false;
};

tick();