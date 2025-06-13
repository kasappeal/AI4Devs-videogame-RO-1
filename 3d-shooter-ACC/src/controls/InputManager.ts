import * as THREE from 'three';

export class InputManager {
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private isPointerLocked: boolean = false;
    private mouseSensitivity: number = 0.002;
    private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');

    constructor(
        private camera: THREE.PerspectiveCamera,
        private renderer: THREE.WebGLRenderer,
        private onShoot: () => void
    ) {
        this.setupControls();
    }

    private setupControls(): void {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Mouse controls
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));

        // Pointer lock
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });
    }

    private handleKeyDown(event: KeyboardEvent): void {
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
    }

    private handleKeyUp(event: KeyboardEvent): void {
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
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isPointerLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.y -= movementX * this.mouseSensitivity;
        this.euler.x -= movementY * this.mouseSensitivity;

        // Limit vertical look angle
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

        this.camera.quaternion.setFromEuler(this.euler);
    }

    private handleMouseDown(event: MouseEvent): void {
        if (!this.isPointerLocked) return;
        
        if (event.button === 0) { // Left click
            this.onShoot();
        }
    }

    public update(moveSpeed: number): THREE.Vector3 {
        if (!this.isPointerLocked) return new THREE.Vector3();

        const direction = new THREE.Vector3();
        
        // Get forward and right vectors from camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Remove vertical component
        forward.y = 0;
        right.y = 0;
        
        // Normalize
        forward.normalize();
        right.normalize();

        // Calculate movement direction
        if (this.moveForward) direction.add(forward);
        if (this.moveBackward) direction.sub(forward);
        if (this.moveRight) direction.add(right);
        if (this.moveLeft) direction.sub(right);

        // Apply movement
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(moveSpeed);
        }

        return direction;
    }
}
