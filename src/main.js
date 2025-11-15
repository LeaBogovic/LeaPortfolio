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

// Raycaster
const raycasterObjects = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

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
camera.position.set(
    -0.04307105681398,
    0.426049991084538,
    0.07353198720262494
);
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
controls.target.set(
    1.086376205707433,
    1.1808734984911493,
    1.5432228011158056
);
controls.update();

// Loaders
const textureLoader = new THREE.TextureLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// ---------------------------------------------------
// Andrew-style texture system (still empty)
// ---------------------------------------------------

const textureMap = {};
const loadedTextures = { day: {}, night: {} };

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
// Mouse move for raycaster
// ---------------------------------------------------

window.addEventListener("mousemove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Helper: is this mesh inside any CHART_ collection?
function isChartMesh(obj) {
    let current = obj;
    while (current) {
        if (
            current.name.includes("CHART_MY_WORK") ||
            current.name.includes("CHART_ABOUT") ||
            current.name.includes("CHART_CONTACT")
        ) {
            return true;
        }
        current = current.parent;
    }
    return false;
}

// ---------------------------------------------------
// Load the room model
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

                // Only meshes that live under CHART_ groups are clickable
                if (isChartMesh(child)) {
                    // store original color once
                    if (child.material && child.material.color && !child.userData.originalColor) {
                        child.userData.originalColor = child.material.color.clone();
                    }
                    raycasterObjects.push(child);
                }

                // clone material so color changes don't affect shared materials
                if (child.material && !child.material.isCloned) {
                    child.material = child.material.clone();
                    child.material.isCloned = true;
                }

                // Andrew's texture system (does nothing yet)
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

        console.log("Clickable meshes count:", raycasterObjects.length);
        raycasterObjects.forEach((m) => console.log("Clickable:", m.name));
    },
    undefined,
    (error) => {
        console.error("Error loading GLB:", error);
    }
);

// ---------------------------------------------------
// Test cube
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
    camera.position.y += Math.sin(elapsed * 0.2) * 0.0005;

    controls.update();

    // Raycast
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(raycasterObjects, true);

    // reset all clickable meshes to original color
    raycasterObjects.forEach((obj) => {
        if (obj.material && obj.material.color && obj.userData.originalColor) {
            obj.material.color.copy(obj.userData.originalColor);
        }
    });

    // highlight hovered ones
    for (let i = 0; i < intersects.length; i++) {
        const mesh = intersects[i].object;
        if (mesh.material && mesh.material.color) {
            mesh.material.color.set(0xff0000);
        }
    }

    document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";

    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
};

render();
