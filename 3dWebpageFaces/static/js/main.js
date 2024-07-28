let scene, camera, renderer;
let cubes = [];
let currentCubeIndex = 0;
let currentFace = 0;
let cubeData = {};
let isRotating = false;
let isTransitioning = false;
let floatingTextElement = null; 

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('cube-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    currentFace = 4;
    camera.position.set(0, -1, 20);
    camera.lookAt(0, 0, 0);

    createFloatingText();

    loadData().then(() => {
        animate();
    });

    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('click', onCubeClick, false);
}

function createCube(index = null) {
    const cube = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = [];

    for (let i = 0; i < 6; i++) {
        const texture = createTextureForFace(i, index !== null ? index : cubes.length);
        materials.push(new THREE.MeshBasicMaterial({ map: texture }));
    }

    const cubeMesh = new THREE.Mesh(geometry, materials);
    cube.add(cubeMesh);
    cubes.push(cube);
    scene.add(cube);

    // Set initial position for the new cube
    const radius = 15;
    const angleStep = (Math.PI * 2) / cubes.length;
    const angle = angleStep * (cubes.length - 1);
    cube.position.set(
        Math.sin(angle) * radius,
        Math.cos(angle) * radius + 10,
        -15
    );
    cube.scale.set(4, 4, 4);

    // Initialize empty data for the new cube if it doesn't exist
    const newCubeIndex = index !== null ? index : cubes.length - 1;
    if (!cubeData.cubes) cubeData.cubes = {};
    if (!cubeData.cubes[newCubeIndex]) {
        cubeData.cubes[newCubeIndex] = {
            faces: {
                1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}
            }
        };
        saveData();
    }

    updateCubePositions();
}


function updateCubePositions() {
    const radius = 15; // Adjust this value to change the arc size
    const angleStep = (Math.PI * 2) / cubes.length;
    
    cubes.forEach((cube, index) => {
        if (index === currentCubeIndex) {
            cube.position.set(0, 0, -10);
            cube.scale.set(8, 8, 8);
        } else {
            const angle = angleStep * index;
            const x = Math.sin(angle) * radius;
            const y = Math.cos(angle) * radius + 10; // Lift cubes up
            const z = -15; // Push non-active cubes back
            cube.position.set(x, y, z);
            cube.scale.set(4, 4, 4); // Make non-active cubes smaller
        }
    });
}

function createTextureForFace(faceIndex, cubeIndex) {
    const faceData = cubeData.cubes && cubeData.cubes[cubeIndex] && cubeData.cubes[cubeIndex].faces[faceIndex + 1];

    if (faceData && faceData.imageData) {
        const image = new Image();
        image.src = faceData.imageData;
        const texture = new THREE.Texture(image);
        image.onload = () => {
            texture.needsUpdate = true;
        };
        return texture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const hue = (faceIndex * 60) % 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 200px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((faceIndex + 1).toString(), 256, 256);

    if (!faceData || !faceData.url) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(206, 256);
        ctx.lineTo(306, 256);
        ctx.moveTo(256, 206);
        ctx.lineTo(256, 306);
        ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
}


function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    updateCube();
    updateFloatingText(); // Add this line
    renderer.render(scene, camera);
}

function rotateCube(direction) {
    if (isRotating || isTransitioning) return;
    isRotating = true;

    const cube = cubes[currentCubeIndex];
    const rotationAngle = Math.PI / 2 * direction;

    new TWEEN.Tween(cube.rotation)
        .to({
            y: cube.rotation.y + rotationAngle
        }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            isRotating = false;
            updateCurrentFace(direction);
            updateFloatingText();
        })
        .start();
}

function updateCurrentFace(direction) {
    const faceMap = [4, 2, 5, 3]; // Top, Front, Bottom, Back
    const currentIndex = faceMap.indexOf(currentFace);
    const newIndex = (currentIndex + direction + faceMap.length) % faceMap.length;
    currentFace = faceMap[newIndex];
    console.log("Current face:", currentFace);
    updateFloatingText();
}

function switchCube(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    const newIndex = (currentCubeIndex - direction + cubes.length) % cubes.length;
    const duration = 1000;

    cubes.forEach((cube, index) => {
        const isCurrentCube = index === currentCubeIndex;
        const isNewCube = index === newIndex;
        
        new TWEEN.Tween(cube.position)
            .to(getTargetPosition(index, isNewCube), duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        new TWEEN.Tween(cube.scale)
            .to(isNewCube ? {x: 8, y: 8, z: 8} : {x: 4, y: 4, z: 4}, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
    });

    setTimeout(() => {
        currentCubeIndex = newIndex;
        isTransitioning = false;
        updateCubePositions();
    }, duration);
}

function getTargetPosition(index, isNewCube) {
    if (isNewCube) {
        return {x: 0, y: 0, z: -10};
    } else {
        const radius = 15;
        const angleStep = (Math.PI * 2) / cubes.length;
        const angle = angleStep * index;
        return {
            x: Math.sin(angle) * radius,
            y: Math.cos(angle) * radius + 10,
            z: -15
        };
    }
}

function enlargeCube() {
    if (isTransitioning) return;
    isTransitioning = true;

    const cube = cubes[currentCubeIndex];
    const duration = 1000;

    // Store the current rotation
    const currentRotation = cube.rotation.clone();

    new TWEEN.Tween(cube.scale)
        .to({ x: 30, y: 30, z: 30 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    new TWEEN.Tween(cube.position)
        .to({ x: 0, y: 0, z: 0 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 0, z: 35 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onComplete(() => {
            isTransitioning = false;
            if (!cubeData.cubes[currentCubeIndex] || !cubeData.cubes[currentCubeIndex].faces[currentFace] || !cubeData.cubes[currentCubeIndex].faces[currentFace].url) {
                promptForWebpage();
            } else {
                showWebpage(cubeData.cubes[currentCubeIndex].faces[currentFace].url);
            }
        })
        .start();

    // Maintain the current rotation
    cube.rotation.copy(currentRotation);
}

function promptForWebpage() {
    const url = prompt("Enter webpage URL:");
    if (url) {
        const proxyUrl = `/proxy/${encodeURIComponent(url)}`;
        if (!cubeData.cubes[currentCubeIndex]) cubeData.cubes[currentCubeIndex] = { faces: {} };
        cubeData.cubes[currentCubeIndex].faces[currentFace] = { url: proxyUrl };
        saveData();
        showWebpage(proxyUrl);
    }
}

function showWebpage(url) {
    const container = document.getElementById('cube-container');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Create a loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Loading...';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    container.appendChild(loadingIndicator);

    // Fetch the proxied content
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(content => {
            iframe.srcdoc = content;
            container.removeChild(loadingIndicator);
            container.appendChild(iframe);

            // Add close button
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.zIndex = '1000';
            
            let isClosing = false;
            closeButton.addEventListener('click', () => {
                if (isClosing) return;
                isClosing = true;

                const captureAndClose = () => {
                    html2canvas(iframe.contentDocument.body).then(canvas => {
                        const texture = new THREE.CanvasTexture(canvas);
                        cubes[currentCubeIndex].children[0].material[currentFace - 1].map = texture;
                        cubes[currentCubeIndex].children[0].material[currentFace - 1].needsUpdate = true;

                        // Save the updated cube data
                        if (!cubeData.cubes[currentCubeIndex]) cubeData.cubes[currentCubeIndex] = { faces: {} };
                        cubeData.cubes[currentCubeIndex].faces[currentFace] = {
                            url: url,
                            imageData: canvas.toDataURL()
                        };
                        saveData();

                        updateFloatingText();

                        container.removeChild(iframe);
                        container.removeChild(closeButton);
                        shrinkCube();
                        isClosing = false;
                    }).catch(error => {
                        console.error('Error capturing iframe content:', error);
                        container.removeChild(iframe);
                        container.removeChild(closeButton);
                        shrinkCube();
                        isClosing = false;
                    });
                };

                // Ensure the iframe content is fully loaded before capturing
                if (iframe.contentDocument.readyState === 'complete') {
                    captureAndClose();
                } else {
                    iframe.onload = captureAndClose;
                }
            });
            container.appendChild(closeButton);

            iframe.onload = () => {
                try {
                    html2canvas(iframe.contentDocument.body).then(canvas => {
                        const texture = new THREE.CanvasTexture(canvas);
                        cubes[currentCubeIndex].children[0].material[currentFace - 1].map = texture;
                        cubes[currentCubeIndex].children[0].material[currentFace - 1].needsUpdate = true;
        
                        // Save the captured image data
                        if (!cubeData.cubes[currentCubeIndex]) cubeData.cubes[currentCubeIndex] = { faces: {} };
                        cubeData.cubes[currentCubeIndex].faces[currentFace] = {
                            url: url,
                            imageData: canvas.toDataURL()
                        };
                        saveData().then(() => {
                            console.log('Image data saved for cube', currentCubeIndex, 'face', currentFace);
                        });
                    });
                } catch (error) {
                    console.error('Error capturing iframe content:', error);
                }
            };
        })
        .catch(error => {
            console.error('Error loading webpage:', error);
            container.removeChild(loadingIndicator);
            const errorMessage = document.createElement('div');
            errorMessage.textContent = `Error loading webpage: ${error.message}`;
            errorMessage.style.color = 'red';
            errorMessage.style.position = 'absolute';
            errorMessage.style.top = '50%';
            errorMessage.style.left = '50%';
            errorMessage.style.transform = 'translate(-50%, -50%)';
            container.appendChild(errorMessage);
        });
}

function updateFloatingText() {
    if (!floatingTextElement) {
        createFloatingText();
    }

    const cube = cubes[currentCubeIndex];
    if (cube && cubeData.cubes && cubeData.cubes[currentCubeIndex] && 
        cubeData.cubes[currentCubeIndex].faces && 
        cubeData.cubes[currentCubeIndex].faces[currentFace] && 
        cubeData.cubes[currentCubeIndex].faces[currentFace].url) {
        
        const url = cubeData.cubes[currentCubeIndex].faces[currentFace].url;
        floatingTextElement.textContent = url;

        // Get the position of the cube in world space
        const cubePosition = new THREE.Vector3();
        cube.getWorldPosition(cubePosition);

        // Project the cube's position to screen space
        const screenPosition = cubePosition.project(camera);

        // Convert to CSS coordinates
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

        // Position the text above the cube
        floatingTextElement.style.left = `${x}px`;
        floatingTextElement.style.top = `${y - 50}px`; // 50px above the cube
        floatingTextElement.style.transform = 'translate(-50%, -100%)'; // Center horizontally and place above
        floatingTextElement.style.display = 'block';
    } else {
        floatingTextElement.style.display = 'none';
    }
}

function createFloatingText() {
    if (!floatingTextElement) {
        floatingTextElement = document.createElement('div');
        floatingTextElement.style.position = 'absolute';
        floatingTextElement.style.color = 'white';
        floatingTextElement.style.fontSize = '16px';
        floatingTextElement.style.fontFamily = 'Arial, sans-serif';
        floatingTextElement.style.padding = '5px';
        floatingTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        floatingTextElement.style.borderRadius = '3px';
        floatingTextElement.style.pointerEvents = 'none'; // Ensure it doesn't interfere with clicks
        document.body.appendChild(floatingTextElement);
    }
}

function shrinkCube() {
    const cube = cubes[currentCubeIndex];
    const duration = 1000;

    new TWEEN.Tween(cube.scale)
        .to({ x: 8, y: 8, z: 8 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    new TWEEN.Tween(cube.position)
        .to({ x: 0, y: 0, z: -10 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 5, z: 15 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
}

function savePage() {
    promptForWebpage();
}

function changePage() {
    promptForWebpage();
}

function removePage() {
    if (cubeData.faces && cubeData.faces[currentFace]) {
        delete cubeData.faces[currentFace];
        saveData();
        updateCube();
    }
}

function loadData() {
    return fetch('/get_data')
        .then(response => response.json())
        .then(data => {
            console.log('Data loaded:', data);
            if (Object.keys(data).length > 0) {
                cubeData = data;
            } else {
                cubeData = { cubes: {} };
            }
            recreateCubes();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            cubeData = { cubes: {} };
            recreateCubes();
        });
}

function recreateCubes() {
    // Remove existing cubes
    cubes.forEach(cube => scene.remove(cube));
    cubes = [];

    // Recreate cubes from loaded data
    if (cubeData.cubes) {
        Object.keys(cubeData.cubes).forEach(index => {
            createCube(parseInt(index));
        });
    }

    // If no cubes were created, create a default cube
    if (cubes.length === 0) {
        createCube();
    }

    currentCubeIndex = 0;
    updateCubePositions();
    updateFloatingText();
}

function saveData() {
    return fetch('/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cubeData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Data saved:', data);
    })
    .catch(error => console.error('Error saving data:', error));
}

function updateCube() {
    cubes[currentCubeIndex].children[0].material.forEach((material, index) => {
        material.map = createTextureForFace(index);
        material.needsUpdate = true;

        // Update floating text
        const faceData = cubeData.cubes && cubeData.cubes[currentCubeIndex] && cubeData.cubes[currentCubeIndex].faces[index + 1];
        if (faceData && faceData.url) {
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(cubes[currentCubeIndex].matrixWorld);
            createFloatingText(faceData.url, position);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCubeClick(event) {
    event.preventDefault();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0 && intersects[0].object.parent === cubes[currentCubeIndex]) {
        const face = Math.floor(intersects[0].faceIndex / 2);
        currentFace = face + 1; // Update currentFace based on the clicked face
        
        // Check if there's a webpage for the clicked face
        if (cubeData.cubes[currentCubeIndex] && 
            cubeData.cubes[currentCubeIndex].faces[currentFace] && 
            cubeData.cubes[currentCubeIndex].faces[currentFace].url) {
            enlargeCube();
            showWebpage(cubeData.cubes[currentCubeIndex].faces[currentFace].url);
        } else {
            enlargeCube();
        }
    }
}

document.getElementById('arrow-left').addEventListener('click', () => rotateCube(-1));
document.getElementById('arrow-right').addEventListener('click', () => rotateCube(1));
document.getElementById('prev-cube').addEventListener('click', () => switchCube(1));
document.getElementById('next-cube').addEventListener('click', () => switchCube(-1));
document.getElementById('plus').addEventListener('click', createCube);
document.getElementById('save').addEventListener('click', savePage);
document.getElementById('change').addEventListener('click', changePage);
document.getElementById('remove').addEventListener('click', removePage);

init();