"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface MovingBlocks3DProps {
  density?: "compact" | "normal" | "spacious";
  interactive?: boolean;
}

export default function MovingBlocks3D({
  density = "normal",
  interactive = true,
}: MovingBlocks3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup (Cyber Dark Tech with Cyan & Violet)
    const ambientLight = new THREE.AmbientLight(0x060913, 2.5);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 4.0, 60);
    cyanLight.position.set(-15, 12, 10);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(0x8b5cf6, 4.5, 60);
    violetLight.position.set(15, 10, -5);
    scene.add(violetLight);

    const blueDirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    blueDirLight.position.set(0, 25, 20);
    scene.add(blueDirLight);

    // 3. Materials
    const darkBlockMat = new THREE.MeshStandardMaterial({
      color: 0x090d18,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82,
    });

    const cyanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0a1f2e,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
    });

    const violetAccentMat = new THREE.MeshStandardMaterial({
      color: 0x170e28,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.32,
      roughness: 0.18,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
    });

    const cyanEdgeMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.55,
      linewidth: 1,
    });

    const violetEdgeMat = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.5,
      linewidth: 1,
    });

    const subtleEdgeMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });

    // 4. Create Undulating 3D Grid Wave Blocks
    const gridCols = density === "compact" ? 14 : 11;
    const gridRows = density === "compact" ? 10 : 8;
    const spacingX = 3.6;
    const spacingZ = 3.4;
    const blockSize = 1.6;

    const blockGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const blockEdgesGeom = new THREE.EdgesGeometry(blockGeometry);

    const waveBlocks: {
      mesh: THREE.Mesh;
      edges: THREE.LineSegments;
      baseX: number;
      baseZ: number;
      baseY: number;
      phase: number;
      speed: number;
    }[] = [];

    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);

    const offsetX = ((gridCols - 1) * spacingX) / 2;
    const offsetZ = ((gridRows - 1) * spacingZ) / 2;

    for (let c = 0; c < gridCols; c++) {
      for (let r = 0; r < gridRows; r++) {
        const x = c * spacingX - offsetX;
        const z = r * spacingZ - offsetZ;
        const distFromCenter = Math.sqrt(x * x + z * z);

        // Color selection based on position / random pattern
        let mat = darkBlockMat;
        let edgeMat = subtleEdgeMat;

        const rand = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
        if (rand > 0.82) {
          mat = cyanAccentMat;
          edgeMat = cyanEdgeMat;
        } else if (rand < 0.22) {
          mat = violetAccentMat;
          edgeMat = violetEdgeMat;
        }

        const mesh = new THREE.Mesh(blockGeometry, mat);
        const edges = new THREE.LineSegments(blockEdgesGeom, edgeMat);
        mesh.add(edges);

        mesh.position.set(x, 0, z);
        blocksGroup.add(mesh);

        waveBlocks.push({
          mesh,
          edges,
          baseX: x,
          baseZ: z,
          baseY: -2.0,
          phase: (x * 0.25) + (z * 0.3) + distFromCenter * 0.1,
          speed: 1.2 + ((c + r) % 3) * 0.2,
        });
      }
    }

    // 5. Create Floating Independent Kinetic Blocks
    const floatCount = 18;
    const floatBlocks: {
      mesh: THREE.Mesh;
      baseX: number;
      baseY: number;
      baseZ: number;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      floatPhase: number;
      floatRadius: number;
    }[] = [];

    for (let i = 0; i < floatCount; i++) {
      const scale = 0.8 + Math.random() * 1.5;
      const geom = new THREE.BoxGeometry(scale, scale, scale);
      const edgeG = new THREE.EdgesGeometry(geom);

      const isCyan = i % 2 === 0;
      const mat = isCyan ? cyanAccentMat : violetAccentMat;
      const edgeM = isCyan ? cyanEdgeMat : violetEdgeMat;

      const mesh = new THREE.Mesh(geom, mat);
      const edges = new THREE.LineSegments(edgeG, edgeM);
      mesh.add(edges);

      const rad = 14 + Math.random() * 18;
      const angle = (i / floatCount) * Math.PI * 2;
      const y = -1 + Math.random() * 14;

      const px = Math.cos(angle) * rad;
      const pz = Math.sin(angle) * rad;

      mesh.position.set(px, y, pz);
      blocksGroup.add(mesh);

      floatBlocks.push({
        mesh,
        baseX: px,
        baseY: y,
        baseZ: pz,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.025,
        rotSpeedZ: (Math.random() - 0.5) * 0.018,
        floatPhase: Math.random() * Math.PI * 2,
        floatRadius: 1.5 + Math.random() * 2.5,
      });
    }

    // 6. Ambient Particle Dust
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 70;
      particlePositions[i + 1] = Math.random() * 30 - 5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 70;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.18,
      transparent: true,
      opacity: 0.45,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 7. Mouse Interactivity & Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 18;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = normalizedX;
      mouseY = normalizedY;

      targetCameraX = normalizedX * 5.0;
      targetCameraY = 18 + normalizedY * 3.5;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 8. Window Resize Handling
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // 9. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera lerp with mouse
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Animate Undulating Wave Blocks
      for (let i = 0; i < waveBlocks.length; i++) {
        const b = waveBlocks[i];
        // Complex smooth harmonic wave equation
        const wave =
          Math.sin(elapsed * b.speed + b.phase) * 1.8 +
          Math.cos(elapsed * 0.7 + b.baseX * 0.18) * 0.9;

        b.mesh.position.y = b.baseY + wave;

        // Subtle dynamic tilt as wave crests
        b.mesh.rotation.x = Math.sin(elapsed * 1.2 + b.phase) * 0.12;
        b.mesh.rotation.z = Math.cos(elapsed * 1.1 + b.phase) * 0.12;

        // Scale breathing on wave peak
        const scaleFactor = 1.0 + (wave > 1.2 ? (wave - 1.2) * 0.08 : 0);
        b.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }

      // Animate Floating Kinetic Blocks
      for (let i = 0; i < floatBlocks.length; i++) {
        const fb = floatBlocks[i];
        fb.mesh.rotation.x += fb.rotSpeedX;
        fb.mesh.rotation.y += fb.rotSpeedY;
        fb.mesh.rotation.z += fb.rotSpeedZ;

        // Orbital bobbing
        fb.mesh.position.y =
          fb.baseY + Math.sin(elapsed * 0.9 + fb.floatPhase) * fb.floatRadius;
        fb.mesh.position.x =
          fb.baseX + Math.cos(elapsed * 0.5 + fb.floatPhase) * 1.2;
        fb.mesh.position.z =
          fb.baseZ + Math.sin(elapsed * 0.6 + fb.floatPhase) * 1.2;
      }

      // Orbit Point Lights to cast moving specular highlights
      cyanLight.position.x = Math.sin(elapsed * 0.4) * 22;
      cyanLight.position.z = Math.cos(elapsed * 0.4) * 22;

      violetLight.position.x = Math.cos(elapsed * 0.35) * 22;
      violetLight.position.z = Math.sin(elapsed * 0.35) * 22;

      // Slow particle field drift
      particles.rotation.y = elapsed * 0.015;

      // Slow subtle group rotation
      blocksGroup.rotation.y = Math.sin(elapsed * 0.05) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js objects
      blockGeometry.dispose();
      blockEdgesGeom.dispose();
      darkBlockMat.dispose();
      cyanAccentMat.dispose();
      violetAccentMat.dispose();
      cyanEdgeMat.dispose();
      violetEdgeMat.dispose();
      subtleEdgeMat.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [density, interactive]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    />
  );
}
