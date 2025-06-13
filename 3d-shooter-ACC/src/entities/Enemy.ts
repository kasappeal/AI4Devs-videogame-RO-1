import * as THREE from 'three';

export interface EnemyJumpState {
    isJumping: boolean;
    jumpHeight: number;
    jumpProgress: number;
    nextJumpDelay: number;
    lastJumpTime: number;
    speed: number;
}

export class Enemy {
    public mesh: THREE.Group;
    public jumpState: EnemyJumpState;

    constructor() {
        this.mesh = this.createMesh();
        this.jumpState = this.initializeJumpState();
    }

    private createMesh(): THREE.Group {
        const enemy = new THREE.Group();

        // Create the main body
        const bodyGeometry = new THREE.BoxGeometry(4, 8, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            shininess: 50,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 4;
        enemy.add(body);

        // Add glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2,
            shininess: 100
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-1, 5.5, 2);
        enemy.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(1, 5.5, 2);
        enemy.add(rightEye);

        // Add lighting effects
        const enemyLight = new THREE.PointLight(0xff0000, 2, 15);
        enemyLight.position.set(0, 4, 0);
        enemy.add(enemyLight);

        const spotlight = new THREE.SpotLight(0xff0000, 5, 20, Math.PI / 4, 0.5);
        spotlight.position.set(0, 5, 2);
        spotlight.target.position.set(0, 0, 5);
        enemy.add(spotlight);
        enemy.add(spotlight.target);

        return enemy;
    }

    private initializeJumpState(): EnemyJumpState {
        return {
            isJumping: false,
            jumpHeight: 0,
            jumpProgress: 0,
            nextJumpDelay: 1000 + Math.random() * 2000, // Random delay between 1-3 seconds
            lastJumpTime: Date.now(),
            speed: 0.03 + Math.random() * 0.04 // Random speed between 0.03 and 0.07
        };
    }
}
