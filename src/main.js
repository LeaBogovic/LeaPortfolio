import "./style.scss";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Canvas
const canvas = document.querySelector(".experience-canvas");

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050509);

// Camera
const camera = new THREE.PerspectiveCamera(
    45,
    sizes.width / sizes.height,
    0.1,
    1000
);
camera.position.set(-0.04307105681398,
    0.426049991084538,
    0.07353198720262494);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();
controls.target.set(1.086376205707433,
    1.1808734984911493,
    1.5432228011158056)
// Loaders
const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// ---------------------------------------------------
// ANDREW’S TEXTURE SYSTEM (EMPTY FOR NOW)
// ---------------------------------------------------

// As you follow Andrew’s video, you will fill this with entries like:
// Frame01: { day: "/textures/frame01_day.png", night: "/textures/frame01_night.png" }
const textureMap = {
    // Example:
    // Panel01: {
    //   day: "/textures/panel01_day.png",
    //   night: "/textures/panel01_night.png"
    // }
};

const loadedTextures = {
    day: {},
    night: {},
};

// Load textures
Object.entries(textureMap).forEach(([key, paths]) => {
    if (paths.day) {
        const dayTex = textureLoader.load(paths.day);
        dayTex.flipY = false;
        dayTex.encoding = THREE.sRGBEncoding;
        loadedTextures.day[key] = dayTex;
    }
    if (paths.night) {
        const nightTex = textureLoader.load(paths.night);
        nightTex.flipY = false;
        nightTex.encoding = THREE.sRGBEncoding;
        loadedTextures.night[key] = nightTex;
    }
});

// ---------------------------------------------------
// LOAD THE ROOM MODEL
// ---------------------------------------------------

let room = null;

loader.load(
    "/models/LeaRoom.glb",
    (gltf) => {
        room = gltf.scene;

        room.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Clone material so it's unique
                if (child.material && !child.material.isCloned) {
                    child.material = child.material.clone();
                    child.material.isCloned = true;
                }

                // Apply textures according to name
                for (const key of Object.keys(textureMap)) {
                    if (child.name.includes(key)) {
                        const tex = loadedTextures.day[key];
                        if (tex) {
                            child.material.map = tex;
                            child.material.needsUpdate = true;
                        }
                    }
                }
            }
        });

        scene.add(room);

        // Frame camera
        const box = new THREE.Box3().setFromObject(room);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraZ = maxDim * 1.5;

        camera.position.set(
            center.x + cameraZ * 0.5,
            center.y + cameraZ * 0.4,
            center.z + cameraZ
        );
        camera.lookAt(center);
        controls.target.copy(center);
        controls.update();
    },
    undefined,
    (error) => {
        console.error("Error loading GLB:", error);
    }
);

// ---------------------------------------------------
// Test Cube (keep so you know render loop works)
// ---------------------------------------------------

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(-2, 1, 0);
scene.add(cube);

// ---------------------------------------------------
// Resize
// ---------------------------------------------------

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ---------------------------------------------------
// Render Loop
// ---------------------------------------------------

const clock = new THREE.Clock();

const render = () => {
    const elapsed = clock.getElapsedTime();

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // Very subtle camera float
    camera.position.y += Math.sin(elapsed * 0.2) * 0.0005;

    controls.update();

   // console.log(camera.position);
   // console.log("00000000000000");
    //console.log(controls.target);
    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
};
render();
