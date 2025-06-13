import * as THREE from 'three';

export class Weapon {
    public model: THREE.Group;
    public recoil: number = 0;
    
    constructor() {
        this.model = new THREE.Group();
        this.createModel();
    }

    private createModel(): void {
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

        // Position
        gunBody.position.set(0, -0.25, -0.75);
        this.model.add(gunBody);

        // Add light
        const weaponLight = new THREE.PointLight(0x00ff00, 0.5, 1);
        weaponLight.position.copy(core.position);
        gunBody.add(weaponLight);
    }

    public updatePosition(): void {
        if (this.recoil > 0) {
            this.model.position.z += this.recoil;
            this.recoil *= 0.8;
            
            if (this.recoil < 0.01) {
                this.recoil = 0;
                this.model.position.z = 0;
            }
        }

        // Add subtle weapon sway
        const time = Date.now() * 0.001;
        const swayX = Math.sin(time * 1.5) * 0.002;
        const swayY = Math.cos(time * 2) * 0.002;
        
        this.model.position.x = 0.3 + swayX;
        this.model.position.y = -0.3 + swayY;
    }

    public applyRecoil(): void {
        this.recoil = 0.1;
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                if (child.material.emissive) {
                    child.material.emissiveIntensity = 1;
                    setTimeout(() => {
                        child.material.emissiveIntensity = 0.5;
                    }, 50);
                }
            }
        });
    }
}
