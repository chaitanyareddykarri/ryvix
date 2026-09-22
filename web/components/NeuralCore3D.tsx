"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function NeuralCore3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth || 480;
    let height = container.clientHeight || 480;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(4.5, 3.4, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Root Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Lighting Setup (Cinematic High-Contrast Dark Tech)
    const ambientLight = new THREE.AmbientLight(0x0a101d, 1.4);
    scene.add(ambientLight);

    const cyanPoint = new THREE.PointLight(0x06b6d4, 5.0, 16);
    cyanPoint.position.set(3.5, 4.5, 3.5);
    scene.add(cyanPoint);

    const violetPoint = new THREE.PointLight(0xa855f7, 4.5, 16);
    violetPoint.position.set(-3.5, -3.5, -3.5);
    scene.add(violetPoint);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-4, 5, 2);
    scene.add(rimLight);

    // 2. Build 3x3x3 Neural Modular Matrix (Cube Cluster)
    const cubeSize = 0.58;
    const gap = 0.08;
    const step = cubeSize + gap;
    const boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Base dark metallic material
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.22,
      metalness: 0.88,
    });

    // Glowing active accent materials
    const cyanActiveMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c2234,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.5,
      roughness: 0.18,
      metalness: 0.9,
    });

    const violetActiveMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b1333,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.9,
    });

    // Edge geometry for glowing cybernetic wireframes
    const edgesGeom = new THREE.EdgesGeometry(boxGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const edgeActiveMaterial = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.75,
    });

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const distFromCenter = Math.abs(x) + Math.abs(y) + Math.abs(z);
          let mat = baseMaterial;
          if (distFromCenter === 1) mat = cyanActiveMaterial;
          if (distFromCenter === 2 && (x + y + z) % 2 === 0) mat = violetActiveMaterial;

          const mesh = new THREE.Mesh(boxGeometry, mat);
          mesh.position.set(x * step, y * step, z * step);
          coreGroup.add(mesh);

          // Add glowing edge line
          const lineMat = distFromCenter >= 2 ? edgeActiveMaterial : edgeMaterial;
          const wireframe = new THREE.LineSegments(edgesGeom, lineMat);
          mesh.add(wireframe);
        }
      }
    }

    // 3. Orbiting Data Packet Particles
    const particleCount = 240;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorCyan = new THREE.Color(0x38bdf8);
    const colorViolet = new THREE.Color(0xa855f7);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.1 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;

      const px = radius * Math.cos(theta) * Math.cos(phi);
      const py = radius * Math.sin(phi);
      const pz = radius * Math.sin(theta) * Math.cos(phi);

      particlePositions[i * 3] = px;
      particlePositions[i * 3 + 1] = py;
      particlePositions[i * 3 + 2] = pz;

      const mixedColor = Math.random() > 0.5 ? colorCyan : colorViolet;
      particleColors[i * 3] = mixedColor.r;
      particleColors[i * 3 + 1] = mixedColor.g;
      particleColors[i * 3 + 2] = mixedColor.b;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 4. Interactive Mouse Tracking & Drag
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.45;
    let targetRotationY = -0.55;
    let isDragging = false;
    let previousPointerX = 0;
    let previousPointerY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouseX = (clientX / width) * 2 - 1;
      mouseY = -(clientY / height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousPointerX;
        const deltaY = e.clientY - previousPointerY;
        targetRotationY += deltaX * 0.01;
        targetRotationX += deltaY * 0.01;
        previousPointerX = e.clientX;
        previousPointerY = e.clientY;
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      previousPointerX = e.clientX;
      previousPointerY = e.clientY;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    // 5. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth idle rotation + mouse influence
      if (!isDragging) {
        targetRotationY += 0.0035;
        targetRotationX = 0.35 + Math.sin(elapsedTime * 0.5) * 0.08 + mouseY * 0.35;
      }

      // Smooth damping interpolation
      coreGroup.rotation.y += (targetRotationY - coreGroup.rotation.y) * 0.06;
      coreGroup.rotation.x += (targetRotationX - coreGroup.rotation.x) * 0.06;

      // Subtle breathing float on Y
      coreGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.08;

      // Rotate particle field in opposing direction
      particles.rotation.y -= 0.0018;
      particles.rotation.x = Math.sin(elapsedTime * 0.4) * 0.15;

      // Pulsate edge light intensity subtly
      cyanPoint.intensity = 4.2 + Math.sin(elapsedTime * 2.5) * 1.0;
      violetPoint.intensity = 3.8 + Math.cos(elapsedTime * 2.0) * 0.8;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      boxGeometry.dispose();
      baseMaterial.dispose();
      cyanActiveMaterial.dispose();
      violetActiveMaterial.dispose();
      edgesGeom.dispose();
      edgeMaterial.dispose();
      edgeActiveMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "480px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "480px",
        }}
      />
      {/* 3D Interactive Tag */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          padding: "6px 14px",
          fontSize: "0.76rem",
          color: "var(--text-secondary)",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#38bdf8",
            boxShadow: "0 0 8px #38bdf8",
          }}
        />
        <span>3D Neural Core · Drag or hover to rotate</span>
      </div>
    </div>
  );
}
