import "./style.css";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#canvas"),
    antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

camera.position.set(0, 5, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 1.5;
controls.minPolarAngle = Math.PI / 6;
controls.target.set(0, 2, 0);
controls.update();

let autoRotate = true;

controls.addEventListener("start", () => {
    autoRotate = false;
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const clickablePoints = [];

// Add an invisible ground plane
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI / 2;
plane.position.y = 0;
plane.receiveShadow = true;
scene.add(plane);

// Dark/Light mode variables
let isDarkMode = false;
let backgroundTexture;

console.log("Initial isDarkMode:", isDarkMode);

// Environment map
new RGBELoader().setPath("/textures/").load(
    "venice_sunset_1k.hdr",
    function (texture) {
        backgroundTexture = texture;
        backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
        console.log("HDR texture loaded successfully");
        console.log("Background texture available:", !!backgroundTexture);
        updateLightingMode();
    },
    undefined,
    function (error) {
        console.error("Error loading HDR texture:", error);
        updateLightingMode();
    }
);

// Improved lighting setup with yellow tint
function setupLighting() {
    const warmYellow = 0xffd54f; // A warm yellow color

    const ambientLight = new THREE.AmbientLight(warmYellow, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(warmYellow, 0.5);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(warmYellow, 1, 10);
    pointLight1.position.set(0, 2, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(warmYellow, 1, 10);
    pointLight2.position.set(3, 2, 2);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(warmYellow, 1, 10);
    pointLight3.position.set(-3, 2, -2);
    scene.add(pointLight3);

    const spotLight = new THREE.SpotLight(warmYellow, 1);
    spotLight.position.set(0, 5, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.castShadow = true;
    scene.add(spotLight);
}

// Optimized model loading
const loadingManager = new THREE.LoadingManager();
const loader = new GLTFLoader(loadingManager);

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`Loading file: ${url}. ${itemsLoaded} of ${itemsTotal} files.`);
};

loadingManager.onLoad = function () {
    console.log("Loading complete!");
};

loadingManager.onError = function (url) {
    console.error("There was an error loading " + url);
};

loader.load("/fantasy_interior_kit/scene.gltf", function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Enable shadows and adjust material properties for better visibility
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.side = THREE.DoubleSide;
                child.material.metalness = 0.3;
                child.material.roughness = 0.7;
                // Add a slight yellow tint to materials
                child.material.color.lerp(new THREE.Color(0xffd54f), 0.2);
            }
        }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = 0;

    // Set up camera and controls
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(0, maxDim / 2, maxDim);
    controls.target.set(0, size.y / 2, 0);
    controls.update();

    // Set up lighting after model is loaded
    setupLighting();

    // Add clickable points inside the model
    addClickablePoint(new THREE.Vector3(0, 2.5, 2.25));
    addClickablePoint(new THREE.Vector3(3.10, 0.5, 2));
    addClickablePoint(new THREE.Vector3(3, 1.5, -4.5));
    addClickablePoint(new THREE.Vector3(0, 3.75, -6.75));
    addClickablePoint(new THREE.Vector3(0, 5, 2));
    addClickablePoint(new THREE.Vector3(-3.25, 0.5, 2));

    // Set up post-processing
    setupPostProcessing();

    // Update lighting mode after model is loaded
    updateLightingMode();

    animate();
});
function addClickablePoint(position) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const point = new THREE.Mesh(geometry, material);
    point.position.copy(position);
    scene.add(point);
    clickablePoints.push(point);
}

// Post-processing setup
let composer;
function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,
        0.4,
        0.85
    );
    composer.addPass(bloomPass);

    const smaaPass = new SMAAPass(
        window.innerWidth * renderer.getPixelRatio(),
        window.innerHeight * renderer.getPixelRatio()
    );
    composer.addPass(smaaPass);
}

// Dark/Light mode functions
function toggleLightingMode() {
    isDarkMode = !isDarkMode;
    updateLightingMode();
    console.log("Mode toggled. Dark mode:", isDarkMode);
}

function updateLightingMode() {
    console.log("Updating lighting mode. isDarkMode:", isDarkMode);
    console.log("Background texture available:", !!backgroundTexture);

    if (isDarkMode) {
        scene.background = new THREE.Color(0x222222);
        scene.environment = null;
        renderer.toneMappingExposure = 0.5;
    } else {
        if (backgroundTexture) {
            scene.background = backgroundTexture;
            scene.environment = backgroundTexture;
        } else {
            scene.background = new THREE.Color(0xf0e68c); // Khaki
            scene.environment = null;
        }
        renderer.toneMappingExposure = 1.2;
    }

    // Adjust light intensities and colors based on mode
    scene.traverse((object) => {
        if (object.isLight) {
            if (isDarkMode) {
                object.intensity *= 0.5;
                object.color.setHex(0xffa500); // More orange-yellow for dark mode
            } else {
                object.intensity = 1;
                object.color.setHex(0xffd54f); // Warm yellow for light mode
            }
        }
        if (object.isMesh && object.material) {
            object.material.needsUpdate = true;
        }
    });
}

// Add a button to toggle between modes
const toggleButton = document.createElement("button");
toggleButton.textContent = "Toggle Dark/Light Mode";
toggleButton.style.position = "absolute";
toggleButton.style.top = "10px";
toggleButton.style.right = "10px";
toggleButton.addEventListener("click", toggleLightingMode);
document.body.appendChild(toggleButton);

let currentPointIndex = 0;

function navigateToPoint(index) {
    if (index < 0 || index >= clickablePoints.length) {
        return;
    }
    currentPointIndex = index;
    const point = clickablePoints[currentPointIndex];
    zoomToPoint(point.position);
}

document.getElementById("prevPoint").addEventListener("click", () => {
    let newPointIndex = currentPointIndex - 1;
    if (newPointIndex < 0) {
        newPointIndex = clickablePoints.length - 1;
    }
    navigateToPoint(newPointIndex);
});

document.getElementById("nextPoint").addEventListener("click", () => {
    let newPointIndex = currentPointIndex + 1;
    if (newPointIndex >= clickablePoints.length) {
        newPointIndex = 0;
    }
    navigateToPoint(newPointIndex);
});

navigateToPoint(0);

function animate() {
    requestAnimationFrame(animate);

    if (autoRotate) {
        const rotationSpeed = 0.001;
        camera.position.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            rotationSpeed
        );
        camera.lookAt(controls.target);
    }

    controls.update();
    highlightClickablePoints();

    // Update bloom pass settings based on mode
    const bloomPass = composer.passes.find(
        (pass) => pass instanceof UnrealBloomPass
    );
    if (bloomPass) {
        bloomPass.strength = isDarkMode ? 0.75 : 0.5;
    }

    // Use the effect composer for rendering
    composer.render();
}

function highlightClickablePoints() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickablePoints);

    clickablePoints.forEach((point) => {
        if (intersects.length > 0 && intersects[0].object === point) {
            point.material.color.setHex(0x00ff00);
        } else {
            point.material.color.setHex(0xffffff);
        }
    });
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickablePoints);

    if (intersects.length > 0) {
        const point = intersects[0].object;
        zoomToPoint(point.position);
    }
}

function zoomToPoint(position) {
    const duration = 1500;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();

    // Calculate a better end position for the camera
    const distance = 5; // Distance from the point
    const direction = new THREE.Vector3()
        .subVectors(startPosition, position)
        .normalize();
    const endPosition = position
        .clone()
        .add(direction.multiplyScalar(distance));

    // Ensure the camera doesn't go below the ground
    endPosition.y = Math.max(endPosition.y, 1.5);

    const startTime = Date.now();

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function zoomStep() {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = easeInOutCubic(progress);

        camera.position.lerpVectors(startPosition, endPosition, easedProgress);
        controls.target.lerpVectors(startTarget, position, easedProgress);

        camera.lookAt(controls.target);

        if (progress < 1) {
            requestAnimationFrame(zoomStep);
        } else {
            controls.update();

            // After zooming, slightly tilt the camera down
            const tiltDuration = 500;
            const tiltStartTime = Date.now();
            const startRotation = camera.rotation.x;
            const endRotation = startRotation - Math.PI / 24; // Tilt down by 7.5 degrees (reduced tilt)

            function tiltStep() {
                const now = Date.now();
                const tiltProgress = Math.min(
                    (now - tiltStartTime) / tiltDuration,
                    1
                );
                const easedTiltProgress = easeInOutCubic(tiltProgress);

                camera.rotation.x = THREE.MathUtils.lerp(
                    startRotation,
                    endRotation,
                    easedTiltProgress
                );

                if (tiltProgress < 1) {
                    requestAnimationFrame(tiltStep);
                } else {
                    controls.update();
                }
            }

            tiltStep();
        }
    }

    zoomStep();
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("mousemove", onMouseMove, false);
window.addEventListener("click", onClick, false);

console.log("Scene setup complete");

// Ensure light mode is set initially
updateLightingMode();
