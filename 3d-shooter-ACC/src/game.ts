import * as THREE from 'three';
import { Enemy } from './entities/Enemy';
import { Weapon } from './entities/Weapon';
import { Environment } from './environment/Environment';
import { InputManager } from './controls/InputManager';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private score: number = 0;
    private scoreElement: HTMLElement | null;
    
    // Countdown variables
    private countdownElement: HTMLElement | null;
    private gameStartTime: number = 0;
    private enemySpawnDelay: number = 5000;
    private gameStarted: boolean = false;
    
    // Movement control variables
    private moveSpeed: number = 0.1;
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    
    // Mouse look variables
    private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private mouseSensitivity: number = 0.002;
    private isPointerLocked: boolean = false;

    // Camera bob effect variables
    private bobTime: number = 0;
    private bobAmount: number = 0.25;
    private bobSpeed: number = 8;
    private lastCameraY: number = 2;

    // Camera recoil effect variables
    private cameraRecoil: number = 0;
    private cameraRecoilRecovery: number = 0.08;

    // Environment variables
    private ground: THREE.Mesh;
    private trees: THREE.Group;
    private groundTextures: THREE.Texture[] = [];
    private trunkTexture: THREE.Texture | null = null;
    private leafsTexture: THREE.Texture | null = null;

    // Weapon variables
    private weaponModel: THREE.Group;
    private weaponRecoil: number = 0;
    private crosshairElement: HTMLElement | null;

    // Shooting variables
    private bullets: THREE.Object3D[] = [];
    private bulletSpeed: number = 2;
    private canShoot: boolean = true;
    private shootCooldown: number = 250; // milliseconds
    private bulletLifespan: number = 1000; // milliseconds

    // Enemy variables
    private enemies: THREE.Group[] = [];
    private enemySpeed: number = 0.05;
    private maxEnemies: number = 5;
    private lastEnemySpawnTime: number = 0;
    private enemySpawnInterval: number = 10000; // milliseconds
    private enemyJumpStates: Map<THREE.Group, {
        isJumping: boolean;
        jumpHeight: number;
        jumpProgress: number;
        nextJumpDelay: number;
        lastJumpTime: number;
        speed: number;
    }> = new Map();
    private enemyTexture: THREE.Texture | null = null;

    // Game over variables
    private gameOverElement: HTMLElement | null;
    private isGameOver: boolean = false;

    // Round variables
    private round: number = 1;
    private baseMinEnemySpeed: number = 0.03;
    private baseMaxEnemySpeed: number = 0.07;
    private enemiesPerRound: number = 1;

    // Radar variables
    private radarCanvas: HTMLCanvasElement | null = document.getElementById('radar-canvas') as HTMLCanvasElement;
    private radarCtx: CanvasRenderingContext2D | null = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
    private radarRange: number = 60; // units in game world

    // Ambient sound
    private ambientAudio: HTMLAudioElement | null = null;

    private shootAudio: HTMLAudioElement | null = null;

    private boomAudio: HTMLAudioElement | null = null;

    private playAmbientSound(): void {
        if (!this.ambientAudio) {
            this.ambientAudio = new Audio('assets/sounds/ambient.mp3');
            this.ambientAudio.loop = true;
            this.ambientAudio.volume = 0.4;
        }
        this.ambientAudio.play().catch(() => {});
    }

    private playShootSound(): void {
        if (!this.shootAudio) {
            this.shootAudio = new Audio('assets/sounds/shoot.mp3');
            this.shootAudio.volume = 0.7;
        }
        // Restart sound if already playing
        this.shootAudio.currentTime = 0;
        this.shootAudio.play().catch(() => {});
    }

    private playBoomSound(): void {
        if (!this.boomAudio) {
            this.boomAudio = new Audio('assets/sounds/boom.mp3');
            this.boomAudio.volume = 0.7;
        }
        this.boomAudio.currentTime = 0;
        this.boomAudio.play().catch(() => {});
    }

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.trees = new THREE.Group();
        this.weaponModel = new THREE.Group();
        this.crosshairElement = document.getElementById('crosshair');
        this.countdownElement = document.getElementById('countdown');
        this.gameOverElement = document.getElementById('gameOver');
        this.scoreElement = document.getElementById('scoreboard');
        
        this.init();
        this.scene.add(this.camera); // Add camera to scene first
        this.setupControls();
        this.createWeaponModel(); // Create weapon before environment
        this.createEnvironment();
        this.setupRetryButton();
        this.playAmbientSound(); // Start ambient sound

        // Initialize game start time
        this.gameStartTime = Date.now();
    }

    private init(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Set initial camera position
        this.camera.position.set(0, 2, 5); // Start at human height
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(100, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Setup pointer lock
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });
    }

    private setupRetryButton(): void {
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    private setupControls(): void {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if (this.isGameOver) return;

            switch (event.key) {
                case 'ArrowUp':
                case 'w':
                    this.moveForward = true;
                    break;
                case 'ArrowDown':
                case 's':
                    this.moveBackward = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.moveLeft = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.moveRight = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.isGameOver) return;

            switch (event.key) {
                case 'ArrowUp':
                case 'w':
                    this.moveForward = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.moveBackward = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.moveLeft = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.moveRight = false;
                    break;
            }
        });

        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            if (!this.isPointerLocked || this.isGameOver) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            this.euler.y -= movementX * this.mouseSensitivity;
            this.euler.x -= movementY * this.mouseSensitivity;

            // Limit vertical look angle
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

            this.camera.quaternion.setFromEuler(this.euler);
        });

        // Add mouse click handler for shooting
        document.addEventListener('mousedown', (event) => {
            if (!this.isPointerLocked || this.isGameOver) return;
            
            if (event.button === 0 && this.canShoot) { // Left click
                this.shoot();
            }
        });
    }

    private shoot(): void {
        if (!this.canShoot || this.isGameOver) return;

        // Start cooldown
        this.canShoot = false;
        setTimeout(() => {
            this.canShoot = true;
        }, this.shootCooldown);

        // Create bullet effect
        const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.8
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        // Position bullet at camera
        bullet.position.copy(this.camera.position);

        // Get shooting direction from camera
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        bullet.userData.direction = direction;
        bullet.userData.createdAt = Date.now();

        // Create lighting effect
        const light = new THREE.PointLight(0xFFFF00, 5, 2);
        light.position.copy(bullet.position);
        bullet.add(light);

        // Create trail effect
        const trailGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.5
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = Math.PI / 2;
        bullet.add(trail);

        this.bullets.push(bullet);
        this.scene.add(bullet);

        // Add muzzle flash
        this.createMuzzleFlash();

        // Add recoil effect
        this.weaponRecoil = 0.1;
        this.cameraRecoil += 0.005; // Add camera recoil (increase for stronger effect)
        
        // Weapon flash effect
        this.weaponModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                if (child.material.emissive) {
                    child.material.emissiveIntensity = 1;
                    setTimeout(() => {
                        child.material.emissiveIntensity = 0.5;
                    }, 50);
                }
            }
        });

        this.playShootSound();
    }

    private createMuzzleFlash(): void {
        const flash = new THREE.PointLight(0xFFFF00, 10, 3);
        flash.position.copy(this.camera.position);
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        flash.position.add(forward.multiplyScalar(2));
        
        this.scene.add(flash);

        // Remove flash after short duration
        setTimeout(() => {
            this.scene.remove(flash);
        }, 50);
    }

    private updateBullets(): void {
        const now = Date.now();
        const bulletsToRemove: THREE.Object3D[] = [];

        this.bullets.forEach(bullet => {
            // Move bullet
            const direction = (bullet.userData.direction as THREE.Vector3);
            bullet.position.add(direction.clone().multiplyScalar(this.bulletSpeed));

            // Check lifespan
            if (now - bullet.userData.createdAt > this.bulletLifespan) {
                bulletsToRemove.push(bullet);
            }
        });

        // Remove old bullets
        bulletsToRemove.forEach(bullet => {
            this.scene.remove(bullet);
            const index = this.bullets.indexOf(bullet);
            if (index > -1) {
                this.bullets.splice(index, 1);
            }
        });
    }

    private loadGroundTextures(): void {
        const loader = new THREE.TextureLoader();
        this.groundTextures = [
            loader.load('assets/textures/ground.jpg')
        ];
        this.groundTextures.forEach(tex => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(40, 40);
        });
    }

    private loadEnemyTexture(): void {
        if (!this.enemyTexture) {
            const loader = new THREE.TextureLoader();
            this.enemyTexture = loader.load('assets/textures/mud.jpg');
        }
    }

    private loadTreeTextures(): void {
        if (!this.trunkTexture) {
            this.trunkTexture = new THREE.TextureLoader().load('assets/textures/trunk.jpg');
        }
        if (!this.leafsTexture) {
            this.leafsTexture = new THREE.TextureLoader().load('assets/textures/leafs.png');
        }
    }

    private createEnvironment(): void {
        this.loadGroundTextures();
        this.loadTreeTextures();
        // Create sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Create ground with random texture
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: this.groundTextures[Math.floor(Math.random() * this.groundTextures.length)],
            roughness: 0.8,
            metalness: 0.2
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Optionally, add a dirt path as a second mesh
        const pathGeometry = new THREE.PlaneGeometry(1000, 20);
        const pathMaterial = new THREE.MeshStandardMaterial({
            map: this.groundTextures[2], // Use mud texture for path
            roughness: 0.7,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.z = 0;
        path.position.y = 0.01; // Slightly above ground
        path.receiveShadow = true;
        this.scene.add(path);

        // Add trees
        this.addTrees();

        // Add fog for atmosphere
        this.scene.fog = new THREE.FogExp2(0x90B77D, 0.02);
    }

    private createWeaponModel(): void {
        // Create gun body
        const gunBody = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        gunBody.add(body);

        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
        const barrel = new THREE.Mesh(barrelGeometry, bodyMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.3;
        barrel.position.y = 0.02;
        gunBody.add(barrel);

        // Energy core
        const coreGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = 0.06;
        gunBody.add(core);

        // Position the weapon
        gunBody.position.set(0, -0.25, -0.75);
        this.weaponModel.add(gunBody);

        // Add weapon light
        const weaponLight = new THREE.PointLight(0x00ff00, 0.5, 1);
        weaponLight.position.copy(core.position);
        gunBody.add(weaponLight);

        // Add weapon to camera
        this.camera.add(this.weaponModel);
    }

    private updateWeaponPosition(): void {
        if (this.weaponRecoil > 0) {
            this.weaponModel.position.z += this.weaponRecoil;
            this.weaponRecoil *= 0.8;
            
            if (this.weaponRecoil < 0.01) {
                this.weaponRecoil = 0;
                this.weaponModel.position.z = 0;
            }
        }

        // Add subtle weapon sway
        const time = Date.now() * 0.001;
        const swayX = Math.sin(time * 1.5) * 0.002;
        const swayY = Math.cos(time * 2) * 0.002;
        
        this.weaponModel.position.x = 0.3 + swayX;
        this.weaponModel.position.y = -0.3 + swayY;
    }

    private createTreeType1(scale: number = 1): THREE.Group {
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.6 * scale, 0.8 * scale, 15 * scale, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            map: this.trunkTexture ?? undefined,
            color: 0x4A3C2A,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.position.y = 7.5 * scale;
        treeGroup.add(trunk);

        // Multiple layers of foliage
        const foliageMaterial = new THREE.MeshStandardMaterial({ 
            map: this.leafsTexture ?? undefined,
            color: 0x2D5A27,
            roughness: 0.8,
            metalness: 0.1
        });

        for (let i = 0; i < 3; i++) {
            const foliageGeometry = new THREE.ConeGeometry(4 * (3 - i) * scale, 8 * scale, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = (12 + i * 6) * scale;
            foliage.castShadow = true;
            treeGroup.add(foliage);
        }

        return treeGroup;
    }

    private createTreeType2(scale: number = 1): THREE.Group {
        const treeGroup = new THREE.Group();
        
        // Curved trunk
        const points = [];
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            points.push(new THREE.Vector3(
                Math.sin(t * Math.PI * 0.5) * 2 * scale,
                i * 3 * scale,
                0
            ));
        }
        
        const trunkGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            8,
            0.5 * scale,
            8,
            false
        );
        
        const trunkMaterial = new THREE.MeshStandardMaterial({
            map: this.trunkTexture ?? undefined,
            color: 0x3A2C1A,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Irregular foliage
        const foliageMaterial = new THREE.MeshStandardMaterial({
            map: this.leafsTexture ?? undefined,
            color: 0x1F4A1F,
            roughness: 0.8,
            metalness: 0.1
        });

        for (let i = 0; i < 5; i++) {
            const size = (2 + Math.random()) * scale;
            const foliageGeometry = new THREE.SphereGeometry(size, 8, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            
            foliage.position.set(
                (Math.random() - 0.5) * 4 * scale,
                (15 + Math.random() * 5) * scale,
                (Math.random() - 0.5) * 4 * scale
            );
            
            foliage.scale.y = 1.5;
            foliage.castShadow = true;
            treeGroup.add(foliage);
        }

        return treeGroup;
    }

    private createTreeType3(scale: number = 1): THREE.Group {
        const treeGroup = new THREE.Group();
        
        // Thick trunk
        const trunkGeometry = new THREE.CylinderGeometry(1 * scale, 1.5 * scale, 20 * scale, 10);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            map: this.trunkTexture ?? undefined,
            color: 0x5C4033,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.position.y = 10 * scale;
        treeGroup.add(trunk);

        // Dense foliage layers
        const foliageMaterial = new THREE.MeshStandardMaterial({
            map: this.leafsTexture ?? undefined,
            color: 0x355E3B,
            roughness: 0.8,
            metalness: 0.1
        });

        // Create main foliage body
        const mainFoliageGeometry = new THREE.SphereGeometry(6 * scale, 10, 10);
        const mainFoliage = new THREE.Mesh(mainFoliageGeometry, foliageMaterial);
        mainFoliage.position.y = 25 * scale;
        mainFoliage.scale.y = 1.5;
        mainFoliage.castShadow = true;
        treeGroup.add(mainFoliage);

        // Add random smaller foliage clusters
        for (let i = 0; i < 8; i++) {
            const smallFoliageGeometry = new THREE.SphereGeometry((2 + Math.random()) * scale, 8, 8);
            const smallFoliage = new THREE.Mesh(smallFoliageGeometry, foliageMaterial);
            
            const angle = (i / 8) * Math.PI * 2;
            const radius = 4 * scale;
            
            smallFoliage.position.set(
                Math.cos(angle) * radius,
                (20 + Math.random() * 10) * scale,
                Math.sin(angle) * radius
            );
            
            smallFoliage.castShadow = true;
            treeGroup.add(smallFoliage);
        }

        return treeGroup;
    }

    private addTrees(): void {
        // Create multiple trees with different types and sizes
        const treeTypes = [
            () => this.createTreeType1(1 + Math.random() * 0.5),
            () => this.createTreeType2(1 + Math.random() * 0.5),
            () => this.createTreeType3(1 + Math.random() * 0.5)
        ];

        // Create forest regions
        for (let region = 0; region < 5; region++) {
            const centerX = (Math.random() - 0.5) * 300;
            const centerZ = (Math.random() - 0.5) * 300;
            
            // Add clusters of trees in each region
            const treesInRegion = 30 + Math.floor(Math.random() * 20);
            
            for (let i = 0; i < treesInRegion; i++) {
                const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
                const treeGroup = treeType();

                // Position within region with some randomness
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 40;
                
                const x = centerX + Math.cos(angle) * radius;
                const z = centerZ + Math.sin(angle) * radius;
                
                // Don't place trees too close to the starting point
                if (Math.sqrt(x * x + z * z) < 15) {
                    continue;
                }

                treeGroup.position.set(x, 0, z);
                
                // Random rotation
                treeGroup.rotation.y = Math.random() * Math.PI * 2;
                
                this.trees.add(treeGroup);
            }
        }

        this.scene.add(this.trees);
    }

    private updateMovement(): void {
        if (!this.isPointerLocked || this.isGameOver) return;

        const direction = new THREE.Vector3();
        
        // Get forward and right vectors from camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Remove vertical component (y) to keep movement horizontal
        forward.y = 0;
        right.y = 0;
        
        // Normalize the vectors after removing vertical component
        forward.normalize();
        right.normalize();

        // Calculate movement direction
        if (this.moveForward) direction.add(forward);
        if (this.moveBackward) direction.sub(forward);
        if (this.moveRight) direction.add(right);
        if (this.moveLeft) direction.sub(right);

        // Normalize and apply movement
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(this.moveSpeed);
            this.camera.position.add(direction);
        }
    }

    private updateCameraBob(): void {
        // Only bob when moving and on the ground
        const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        if (isMoving && this.isPointerLocked && !this.isGameOver) {
            this.bobTime += this.bobSpeed * 0.016; // 0.016 ~ 60fps
            const bobOffset = Math.sin(this.bobTime) * this.bobAmount;
            this.camera.position.y = 2 + bobOffset;
            this.lastCameraY = this.camera.position.y;
        } else {
            // Smoothly return to default height
            this.camera.position.y += (2 - this.camera.position.y) * 0.1;
            this.bobTime = 0;
        }
    }

    private updateCameraRecoil(): void {
        if (this.cameraRecoil > 0.001) {
            this.euler.x -= this.cameraRecoil;
            this.cameraRecoil *= (1 - this.cameraRecoilRecovery);
            // Clamp vertical look angle
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        } else {
            this.cameraRecoil = 0;
        }
    }

    private spawnEnemies(count: number): void {
        const minSpeed = this.baseMinEnemySpeed + (this.round - 1) * 0.02;
        const maxSpeed = this.baseMaxEnemySpeed + (this.round - 1) * 0.02;
        for (let i = 0; i < count; i++) {
            const enemy = this.createEnemy();
            
            // Spawn in random position around the player
            const angle = Math.random() * Math.PI * 2;
            const minDistance = 30; // Minimum spawn distance
            const maxDistance = 100; // Maximum spawn distance
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            enemy.position.x = this.camera.position.x + Math.cos(angle) * distance;
            enemy.position.z = this.camera.position.z + Math.sin(angle) * distance;
            
            // Initialize enemy with random movement characteristics
            this.enemyJumpStates.set(enemy, {
                isJumping: false,
                jumpHeight: 3 + Math.random() * 4, // Random jump height between 3 and 7
                jumpProgress: 0,
                nextJumpDelay: 500 + Math.random() * 2500, // Random delay between 0.5 and 3 seconds
                lastJumpTime: Date.now(),
                speed: minSpeed + Math.random() * (maxSpeed - minSpeed) // Speed increases each round
            });
            
            this.enemies.push(enemy);
            this.scene.add(enemy);
        }
    }

    private createEnemy(): THREE.Group {
        this.loadEnemyTexture();
        const enemy = new THREE.Group();

        // Create the main body (bigger and more visible)
        const bodyGeometry = new THREE.BoxGeometry(4, 8, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            map: this.enemyTexture,
            // color: 0xff0000,
            // emissive: 0xff0000,
            // emissiveIntensity: 0.5,
            shininess: 100,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 4; // Lift it higher above ground
        enemy.add(body);

        // Add bigger, more intense glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2,
            shininess: 100
        });

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-1, 5.5, 2);
        enemy.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(1, 5.5, 2);
        enemy.add(rightEye);

        // Add stronger light for better visibility
        const enemyLight = new THREE.PointLight(0xff0000, 2, 15);
        enemyLight.position.set(0, 4, 0);
        enemy.add(enemyLight);

        // Add a spotlight in front of the enemy
        const spotlight = new THREE.SpotLight(0xff0000, 5, 20, Math.PI / 4, 0.5);
        spotlight.position.set(0, 5, 2);
        spotlight.target.position.set(0, 0, 5);
        enemy.add(spotlight);
        enemy.add(spotlight.target);

        // Initialize jump state for the new enemy
        this.enemyJumpStates.set(enemy, {
            isJumping: false,
            jumpHeight: 0,
            jumpProgress: 0,
            nextJumpDelay: 1000 + Math.random() * 2000, // Random delay between jumps
            lastJumpTime: Date.now(),
            speed: 0.03 + Math.random() * 0.02 // Random speed between 0.03 and 0.05
        });

        return enemy;
    }

    private createExplosion(position: THREE.Vector3): void {
        const particles: THREE.Points[] = [];
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y + 4; // Centered at enemy height
            positions[i * 3 + 2] = position.z;
            // Random velocity for each particle
            const dir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(0.5 + Math.random() * 1.5);
            velocities.push(dir);
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.5 });
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        particles.push(points);

        // Animate explosion
        let elapsed = 0;
        const duration = 600; // ms
        const animateExplosion = () => {
            elapsed += 16;
            const pos = geometry.getAttribute('position');
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i].x * 0.2;
                positions[i * 3 + 1] += velocities[i].y * 0.2;
                positions[i * 3 + 2] += velocities[i].z * 0.2;
            }
            pos.needsUpdate = true;
            if (elapsed < duration) {
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(points);
            }
        };
        animateExplosion();
    }

    private checkGameOver(enemy: THREE.Group): boolean {
        const playerPos = this.camera.position.clone();
        const enemyPos = enemy.position.clone();
        
        // Only check horizontal distance
        playerPos.y = 0;
        enemyPos.y = 0;
        
        const distance = playerPos.distanceTo(enemyPos);
        return distance < 3; // Game over if enemy is within 3 units
    }

    private triggerGameOver(): void {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        
        // Show game over screen with final score
        if (this.gameOverElement) {
            const gameOverTitle = this.gameOverElement.querySelector('h1');
            if (gameOverTitle) {
                gameOverTitle.textContent = `Game Over - Final Score: ${this.score}`;
            }
            this.gameOverElement.classList.add('visible');
        }
        
        // Release pointer lock
        document.exitPointerLock();
        
        // Disable controls
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canShoot = false;
    }

    private updateCountdown(): void {
        if (!this.countdownElement || this.gameStarted) return;

        const currentTime = Date.now();
        const elapsedTime = currentTime - this.gameStartTime;
        const remainingTime = Math.ceil((this.enemySpawnDelay - elapsedTime) / 1000);

        if (remainingTime > 0) {
            this.countdownElement.textContent = remainingTime.toString();
            this.countdownElement.classList.add('visible');
        } else if (!this.gameStarted) {
            this.countdownElement.classList.remove('visible');
            this.gameStarted = true;
            this.spawnEnemies(this.enemiesPerRound); // Initial enemy spawn
        }
    }

    private updateScore(): void {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${this.score}`;
        }
    }

    private updateEnemies(): void {
        // Only update if game is not over
        if (this.isGameOver) return;

        const now = Date.now();

        // Only update enemies after the delay
        if (!this.gameStarted) return;

        // Spawn new enemies periodically if below max
        if (now - this.lastEnemySpawnTime > this.enemySpawnInterval && this.enemies.length < this.maxEnemies) {
            this.round++;
            this.enemiesPerRound = this.round; // Increase by 1 each round
            this.spawnEnemies(this.enemiesPerRound);
            this.lastEnemySpawnTime = now;
        }

        // Update each enemy's position and behavior
        this.enemies.forEach(enemy => {
            const jumpState = this.enemyJumpStates.get(enemy);
            if (!jumpState) return;

            // Check for game over condition first
            if (this.checkGameOver(enemy)) {
                this.triggerGameOver();
                return;
            }

            // Get direction to player
            const directionToPlayer = new THREE.Vector3()
                .copy(this.camera.position)
                .sub(enemy.position)
                .normalize();

            // Calculate ground direction (ignore y component)
            directionToPlayer.y = 0;
            directionToPlayer.normalize();

            // Handle jumping with individual frequencies
            if (!jumpState.isJumping) {
                // Start a new jump if enough time has passed
                if (now - jumpState.lastJumpTime > jumpState.nextJumpDelay) {
                    jumpState.isJumping = true;
                    jumpState.jumpHeight = 3 + Math.random() * 4; // Random jump height between 3 and 7
                    jumpState.jumpProgress = 0;
                }
            }

            if (jumpState.isJumping) {
                // Update jump progress
                jumpState.jumpProgress += 0.05;
                
                // Calculate vertical position using sine wave for smooth up/down motion
                const jumpY = Math.sin(jumpState.jumpProgress * Math.PI) * jumpState.jumpHeight;
                enemy.position.y = jumpY;

                // Move faster during jump using individual speed
                enemy.position.add(directionToPlayer.multiplyScalar(jumpState.speed * 2));

                // End jump when complete
                if (jumpState.jumpProgress >= 1) {
                    jumpState.isJumping = false;
                    jumpState.lastJumpTime = now;
                    jumpState.nextJumpDelay = 500 + Math.random() * 2500; // Random delay between 0.5 and 3 seconds
                    enemy.position.y = 0;
                }
            } else {
                // Regular ground movement between jumps using individual speed
                enemy.position.add(directionToPlayer.multiplyScalar(jumpState.speed));
            }

            // Make enemy face the player
            enemy.lookAt(this.camera.position);

            // Check for bullet hits
            this.bullets.forEach(bullet => {
                const bulletPos = bullet.position;
                const enemyPos = enemy.position.clone();
                enemyPos.y += 4; // Adjust for enemy height

                if (bulletPos.distanceTo(enemyPos) < 3) { // 3 units hit radius
                    // Explosion animation
                    this.createExplosion(enemy.position.clone());
                    this.playBoomSound(); // Play boom sound when enemy is shot
                    // Remove the hit enemy and its jump state
                    this.scene.remove(enemy);
                    this.enemyJumpStates.delete(enemy);
                    const index = this.enemies.indexOf(enemy);
                    if (index > -1) {
                        this.enemies.splice(index, 1);
                    }
                    // Remove the bullet
                    this.scene.remove(bullet);
                    const bulletIndex = this.bullets.indexOf(bullet);
                    if (bulletIndex > -1) {
                        this.bullets.splice(bulletIndex, 1);
                    }
                    // Increment score and update scoreboard
                    this.score++;
                    this.updateScore();
                }
            });
        });
    }

    private checkCollisionsWithTrees(): void {
        const playerPosition = this.camera.position.clone();

        // Check player collision with trees
        this.trees.children.forEach(tree => {
            const treePosition = tree.position.clone();
            const distance = playerPosition.distanceTo(treePosition);
            if (distance < 2) { // Adjust collision radius as needed
                console.log('Player collided with a tree!');
                // Stop player movement by resetting position
                const directionToTree = treePosition.clone().sub(playerPosition).normalize();
                this.camera.position.sub(directionToTree.multiplyScalar(0.1));
            }
        });

        // Check enemies collision with trees
        this.enemies.forEach(enemy => {
            const enemyPosition = enemy.position.clone();
            this.trees.children.forEach(tree => {
                const treePosition = tree.position.clone();
                const distance = enemyPosition.distanceTo(treePosition);
                if (distance < 2) { // Adjust collision radius as needed
                    console.log('Enemy collided with a tree!');
                    // Stop enemy movement by resetting position
                    const directionToTree = treePosition.clone().sub(enemyPosition).normalize();
                    enemy.position.sub(directionToTree.multiplyScalar(0.1));
                }
            });
        });
    }

    private updateRadar(): void {
        if (!this.radarCanvas || !this.radarCtx) return;
        const ctx = this.radarCtx;
        ctx.clearRect(0, 0, this.radarCanvas.width, this.radarCanvas.height);
        // Draw radar background
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(60, 60, 58, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.restore();
        // Draw player at center
        ctx.beginPath();
        ctx.arc(60, 60, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        // Draw enemies
        const playerPos = this.camera.position;
        const playerDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const playerAngle = Math.atan2(playerDir.x, playerDir.z);
        this.enemies.forEach(enemy => {
            const dx = enemy.position.x - playerPos.x;
            const dz = enemy.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > this.radarRange) return;
            // Rotate enemy position by -playerAngle
            const angle = Math.atan2(dx, dz) - playerAngle;
            const radarDist = (dist / this.radarRange) * 50;
            const ex = 60 + Math.sin(angle) * radarDist;
            const ey = 60 - Math.cos(angle) * radarDist;
            ctx.beginPath();
            ctx.arc(ex, ey, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
        });
    }

    public animate(): void {
        requestAnimationFrame(() => this.animate());

        if (!this.isGameOver) {
            this.updateMovement();
            this.updateBullets();
            this.updateWeaponPosition();
            this.updateCountdown();
            this.updateEnemies();
            this.checkCollisionsWithTrees(); // Add collision detection
            this.updateCameraBob(); // Add camera bob effect
            this.updateCameraRecoil(); // Add camera recoil update
            this.updateRadar(); // Draw radar each frame

            // Ensure camera doesn't go below ground level
            if (this.camera.position.y < 2) {
                this.camera.position.y = 2;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}