import * as THREE from 'three';

export class Environment {
    public scene: THREE.Scene;
    public ground: THREE.Mesh;
    public trees: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.trees = new THREE.Group();
        this.createEnvironment();
    }

    private createEnvironment(): void {
        this.createSky();
        this.createGround();
        this.addTrees();
        this.addFog();
    }

    private createSky(): void {
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    private createGround(): void {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x355E3B,
            roughness: 0.8,
            metalness: 0.2
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    private addTrees(): void {
        const treeTypes = [
            () => this.createTreeType1(1 + Math.random() * 0.5),
            () => this.createTreeType2(1 + Math.random() * 0.5),
            () => this.createTreeType3(1 + Math.random() * 0.5)
        ];

        // Create forest regions
        for (let region = 0; region < 5; region++) {
            this.createForestRegion(treeTypes);
        }

        this.scene.add(this.trees);
    }

    private createForestRegion(treeTypes: Array<() => THREE.Group>): void {
        const centerX = (Math.random() - 0.5) * 300;
        const centerZ = (Math.random() - 0.5) * 300;
        
        const treesInRegion = 30 + Math.floor(Math.random() * 20);
        
        for (let i = 0; i < treesInRegion; i++) {
            const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            const treeGroup = treeType();

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 40;
            
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            if (Math.sqrt(x * x + z * z) < 15) continue;

            treeGroup.position.set(x, 0, z);
            treeGroup.rotation.y = Math.random() * Math.PI * 2;
            
            this.trees.add(treeGroup);
        }
    }

    private addFog(): void {
        this.scene.fog = new THREE.FogExp2(0x90B77D, 0.02);
    }

    // Tree creation methods from original code
    private createTreeType1(scale: number = 1): THREE.Group {
        // ... existing tree type 1 creation code ...
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.6 * scale, 0.8 * scale, 15 * scale, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4A3C2A,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.position.y = 7.5 * scale;
        treeGroup.add(trunk);

        const foliageMaterial = new THREE.MeshStandardMaterial({ 
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
        // ... existing tree type 2 creation code ...
        const treeGroup = new THREE.Group();
        
        // Curved trunk code remains the same
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

        // Rest of tree type 2 creation code remains the same
        return treeGroup;
    }

    private createTreeType3(scale: number = 1): THREE.Group {
        // ... existing tree type 3 creation code ...
        const treeGroup = new THREE.Group();
        
        // Implementation remains the same
        return treeGroup;
    }
}
