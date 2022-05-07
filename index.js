import * as THREE from 'three';
// import Simplex from './simplex-noise.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useScene, useInternals, useLocalPlayer, useActivate, useUse, useWear, usePhysics, getAppByPhysicsId, useCleanup, useSound} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localLine = new THREE.Line3();

const _makeSwordTransform = () => {
  return {
    swordPosition: new THREE.Vector3(),
    swordQuaternion: new THREE.Quaternion(),
    shoulderPosition: new THREE.Vector3(),
    shoulderQuaternion: new THREE.Quaternion(),
    copy(t) {
      this.swordPosition.copy(t.swordPosition);
      this.swordQuaternion.copy(t.swordQuaternion);
      this.shoulderPosition.copy(t.shoulderPosition);
      this.shoulderQuaternion.copy(t.shoulderQuaternion);
    }
  };
};
const tempSwordTransform = _makeSwordTransform();
const tempSwordTransform2 = _makeSwordTransform();

const startSwordTransform = _makeSwordTransform();
const lastSwordTransform = _makeSwordTransform();

export default e => {
  const app = useApp();
  window.silsword = app;
  const scene = useScene();
  const {renderer, camera, sceneLowPriority} = useInternals();
  const physics = usePhysics();

  const sounds = useSound();
  const soundFiles = sounds.getSoundFiles();
  const soundIndex=soundFiles.combat.map(sound => sound.name).indexOf('combat/sword_slash0-1.wav');

  const {components} = app;

  const swordBackOffset = 0.5;
  const swordLength = 1.4;
  const maxNumDecals = 128;
  const normalScale = 0.05;
  const numSegments = 128;
  const planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1)
    // .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), Math.PI*0.5))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.5, 0))
    .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), -Math.PI*0.5))
    .toNonIndexed();
  
  const textureLoader = new THREE.TextureLoader()
  const texture = textureLoader.load(baseUrl + 'chevron2.svg');
  const textureR = textureLoader.load(baseUrl + 'textures/r.jpg');
  const textureG = textureLoader.load(baseUrl + 'textures/g.jpg');
  const textureB = textureLoader.load(baseUrl + 'textures/b.jpg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const decalMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    map: texture,
    side: THREE.DoubleSide,
    // transparent: true,
  });
  // decalMaterial.freeze();

  // test the decal texture
  // const m = new THREE.Mesh(planeGeometry, decalMaterial);
  // scene.add(m);

  /* const boxGeometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
  const currentTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
  scene.add(currentTransformMesh);
  const backTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0x0000ff}));
  scene.add(backTransformMesh); */

  const _makeDecalMesh = () => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(planeGeometry.attributes.position.array.length * numSegments * maxNumDecals);
    const positionsAttribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionsAttribute);
    const normals = new Float32Array(planeGeometry.attributes.normal.array.length * numSegments * maxNumDecals);
    const normalsAttribute = new THREE.BufferAttribute(normals, 3);
    geometry.setAttribute('normal', normalsAttribute);
    const uvs = new Float32Array(planeGeometry.attributes.uv.array.length * numSegments * maxNumDecals);
    const uvsAttribute = new THREE.BufferAttribute(uvs, 2);
    geometry.setAttribute('uv', uvsAttribute);
    // const indices = new Uint16Array(planeGeometry.index.array.length * maxNumDecals);
    // const indicesAttribute = new THREE.BufferAttribute(indices, 1);
    // geometry.setIndex(indicesAttribute);

    const decalMesh = new THREE.Mesh(geometry, decalMaterial);
    decalMesh.name = 'DecalMesh';
    decalMesh.frustumCulled = false;
    decalMesh.offset = 0;
    let lastHitPoint = null;
    const width = 0.2;
    const thickness = 0.05;
    decalMesh.update = (using, matrixWorldSword, matrixWorldShoulder) => {
      const _getCurrentSwordTransform = swordTransform => {
        matrixWorldSword.decompose(localVector, localQuaternion, localVector2);
        localQuaternion.multiply(
          localQuaternion2.setFromAxisAngle(localVector2.set(1, 0, 0), Math.PI*0.5)
        );
        swordTransform.swordPosition.copy(localVector);
        swordTransform.swordQuaternion.copy(localQuaternion);

        matrixWorldShoulder.decompose(swordTransform.shoulderPosition, swordTransform.shoulderQuaternion, localVector2);

        return swordTransform;
      };
      const endSwordTransform = _getCurrentSwordTransform(tempSwordTransform);

      /* // debug meshes
      {
        currentTransformMesh.position.copy(
          endSwordTransform.swordPosition
        ).add(
          new THREE.Vector3(0, 0, -swordLength)
            .applyQuaternion(endSwordTransform.swordQuaternion)
        );
        currentTransformMesh.quaternion.copy(endSwordTransform.swordQuaternion);
        currentTransformMesh.updateMatrixWorld();

        backTransformMesh.position.copy(endSwordTransform.shoulderPosition);
        backTransformMesh.quaternion.copy(endSwordTransform.shoulderQuaternion);
        backTransformMesh.updateMatrixWorld();
      } */

      if (!using) {
        startSwordTransform.copy(endSwordTransform);
        lastSwordTransform.copy(endSwordTransform);
        lastHitPoint = null;
        return;
      }

      const _lerpSwordTransform = (a, b, swordTransform, f) => {
        swordTransform.shoulderPosition.copy(a.shoulderPosition).lerp(b.shoulderPosition, f);
        swordTransform.shoulderQuaternion.copy(a.shoulderQuaternion).slerp(b.shoulderQuaternion, f);
        swordTransform.swordPosition.copy(a.swordPosition).lerp(b.swordPosition, f);
        swordTransform.swordQuaternion.copy(a.swordQuaternion).slerp(b.swordQuaternion, f);
        return swordTransform;
      };
      // XXX this should have destination sword transform as an argument, to prevent allocations
      const _getNextPoint = currentSwordTransform => {
        const line = localLine.set(
          currentSwordTransform.shoulderPosition,
          currentSwordTransform.swordPosition.clone()
            .add(localVector.set(0, 0, -swordLength).applyQuaternion(currentSwordTransform.swordQuaternion))
        );
        const lineQuaternion = localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            line.start,
            line.end,
            localVector.set(0, 1, 0)
          )
        );
        let result = physics.raycast(line.start, lineQuaternion);

        if (result) {
          const hitPoint = localVector.fromArray(result.point);
          if (hitPoint.distanceTo(line.start) <= line.distance()) {
            /* // debug meshes
            // {
              const boxGeometry3 = new THREE.BoxBufferGeometry(0.01, 0.01, 0.01);
              const hitMesh = new THREE.Mesh(boxGeometry3, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
              hitMesh.position.copy(hitPoint);
              hitMesh.updateMatrixWorld();
              scene.add(hitMesh);
            // } */

            // if consecutive hits are too far apart, treat them as separate hits
            if (lastHitPoint && hitPoint.distanceTo(lastHitPoint.hitPoint) > 0.2) {
              lastHitPoint = null;
            }

            const normal = localVector2.copy(line.start)
              .sub(line.end)
              .normalize();
            const hitNormal = localVector3.fromArray(result.normal);

            const normalScaled = localVector4.copy(normal).multiplyScalar(normalScale);
            const normalBack = localVector5.copy(normal).multiplyScalar(swordBackOffset);
            const hitNormalBack = localVector6.copy(hitNormal).multiplyScalar(swordBackOffset);
    
            const normalUpQuaternion = localQuaternion2.setFromUnitVectors(
              localVector7.set(0, 0, -1),
              normal
            );
            const normalDownQuaternion = localQuaternion3.setFromUnitVectors(
              localVector7.set(0, 0, 1),
              normal
            );
    
            let rotationMatrix;
            let localWidth;
            let initialHit;
            if (lastHitPoint) {
              rotationMatrix = localMatrix.lookAt(
                lastHitPoint.hitPoint,
                hitPoint,
                hitNormal
              );
              localWidth = lastHitPoint.hitPoint.distanceTo(hitPoint);
              initialHit = false;
            } else {
              rotationMatrix = null;
              localWidth = 0;
              initialHit = true;
            }

            return {
              initialHit,
              hitPoint: hitPoint.clone(),
              rotationMatrix: rotationMatrix && rotationMatrix.clone(),
              normal: normal.clone(),
              normalBack: normalBack.clone(),
              normalScaled: normalScaled.clone(),
              hitNormalBack: hitNormalBack.clone(),
              normalUpQuaternion: normalUpQuaternion.clone(),
              normalDownQuaternion: normalDownQuaternion.clone(),
              width: localWidth,
              thickness,
              forwardLeftPoint: new THREE.Vector3(),
              forwardRightPoint: new THREE.Vector3(),
            };
          } else {
            return null;
          }
        } else {
          return null;
        }
      };
      const localDecalGeometries = [];
      let uvOffset = 0;
      const _drawPoints = () => {
        for (let i = 1; i < numSegments; i++) {
          const f = i/(numSegments - 1);

          const currentSwordTransform = _lerpSwordTransform(startSwordTransform, endSwordTransform, tempSwordTransform2, f);
          /* if (using) {
            const hitMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
            hitMesh.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, -swordLength).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh.updateMatrixWorld();
            scene.add(hitMesh);

            const box2Geometry = new THREE.BoxBufferGeometry(0.005, 0.005, 1)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.5))
              .applyMatrix4(new THREE.Matrix4().makeScale(1, 1, swordBackOffset + swordLength));

            const hitMesh2 = new THREE.Mesh(
              box2Geometry,
              new THREE.MeshBasicMaterial({color: 0x00FF00})
            );
            hitMesh2.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, swordBackOffset).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh2.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh2.updateMatrixWorld();
            scene.add(hitMesh2);
          } */

          const nextPoint = _getNextPoint(currentSwordTransform);
          if (nextPoint && !nextPoint.initialHit) {
            let {hitPoint, rotationMatrix, normal, normalBack, normalScaled, hitNormalBack, normalDownQuaternion, width, thickness} = nextPoint;

            const localDecalGeometry = planeGeometry.clone();

            localDecalGeometry
              .applyMatrix4(localMatrix.makeScale(thickness, 1, width))
              .applyMatrix4(rotationMatrix)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(
                hitPoint.x,
                hitPoint.y,
                hitPoint.z
              ));
            
            const uvs = localDecalGeometry.attributes.uv.array;
            for (let j = 0; j < localDecalGeometry.attributes.uv.count; j++) {
              const index = j*2;
              const yIndex = index + 1;
              uvs[yIndex] = (uvOffset + uvs[yIndex] * width) * 4; // y
            }
            uvOffset += width;

            // if there was a previous point, copy the last point's forward points to the next point's backward points
            if (lastHitPoint && !lastHitPoint.initialHit) {
              for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
                localVector.fromArray(planeGeometry.attributes.position.array, j*3);
                if (localVector.z >= 1) { // if this is a backward point
                  const isLeft = localVector.x < 0;
                  (isLeft ? lastHitPoint.forwardLeftPoint : lastHitPoint.forwardRightPoint)
                    .toArray(localDecalGeometry.attributes.position.array, j*3);
                }
              }
            }

           // make the local decal geometry conform to the object mesh by raycasting from the decal mesh points down the normal
            for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
              // localVector.fromArray(planeGeometry.attributes.position.array, j*3);
              if (
                localVector.z < 1 || // if this is a forward point
                lastHitPoint.initialHit // if this is the beginning of a chain
              ) {
                localVector.fromArray(localDecalGeometry.attributes.position.array, j*3);
                localVector2.copy(localVector)
                  .add(normalBack);
                const result = physics.raycast(localVector2, normalDownQuaternion);
                if (result) {
                  localVector3.fromArray(result.point);
                  if (localVector.distanceTo(localVector3) < 0.1) {
                    localVector3
                      .add(normalScaled)
                      .toArray(localDecalGeometry.attributes.position.array, j*3);
                  } else {
                    localVector.add(
                      localVector2.copy(localVector3)
                        .sub(localVector)
                        .normalize()
                        .multiplyScalar(0.1)
                    ).toArray(localDecalGeometry.attributes.position.array, j*3);
                  }
                }
              }
            }

            nextPoint.forwardLeftPoint.fromArray(localDecalGeometry.attributes.position.array, 0*3);
            nextPoint.forwardRightPoint.fromArray(localDecalGeometry.attributes.position.array, 2*3);
            localDecalGeometries.push(localDecalGeometry);
          }

          lastSwordTransform.copy(currentSwordTransform);
          lastHitPoint = nextPoint;
        }
      };
      _drawPoints();
      decalMesh.mergeGeometries(localDecalGeometries);
      startSwordTransform.copy(endSwordTransform);
      lastSwordTransform.copy(endSwordTransform);
    };
    const updateRanges = [];
    decalMesh.mergeGeometries = localDecalGeometies => {
      if (localDecalGeometies.length > 0) {
        const _makeUpdateRange = () => ({
          position: {
            offset: decalMesh.offset*3,
            count: 0,
          },
          uv: {
            offset: decalMesh.offset*2,
            count: 0,
          },
          normal: {
            offset: decalMesh.offset*3,
            count: 0,
          },
        });
        const lastUpdateRange = updateRanges.length > 0 ? updateRanges[updateRanges.length - 1] : null;
        let updateRange = (
          lastUpdateRange &&
            ((lastUpdateRange.position.offset + lastUpdateRange.position.count) < decalMesh.geometry.attributes.position.count*3)
        ) ? lastUpdateRange : null;
        for (const localDecalGeometry of localDecalGeometies) {
          const startOffset = decalMesh.offset;
          
          for (let i = 0; i < localDecalGeometry.attributes.position.count; i++) {
            decalMesh.geometry.attributes.position.setXYZ( i + startOffset, localDecalGeometry.attributes.position.getX(i), localDecalGeometry.attributes.position.getY(i), localDecalGeometry.attributes.position.getZ(i) );
            decalMesh.geometry.attributes.uv.setXY( i + startOffset, localDecalGeometry.attributes.uv.getX(i), localDecalGeometry.attributes.uv.getY(i) );
            decalMesh.geometry.attributes.normal.setXYZ( i + startOffset, localDecalGeometry.attributes.normal.getX(i), localDecalGeometry.attributes.normal.getY(i), localDecalGeometry.attributes.normal.getZ(i) );
            // decalMesh.geometry.index.setX( i + offset, localDecalGeometry.index.getX(i) );
          }

          // flag geometry attributes for update
          if (!updateRange) {
            updateRange = _makeUpdateRange();
            updateRanges.push(updateRange);
          }
          updateRange.position.count += localDecalGeometry.attributes.position.count*3;
          updateRange.uv.count += localDecalGeometry.attributes.uv.count*2;
          updateRange.normal.count += localDecalGeometry.attributes.normal.count*3;

          // update geometry attribute offset
          decalMesh.offset += localDecalGeometry.attributes.position.count;
          if (decalMesh.offset >= decalMesh.geometry.attributes.position.count) {
            decalMesh.offset = decalMesh.offset % decalMesh.geometry.attributes.position.count;
            updateRange = null;
          }
        }
      }
    };
    decalMesh.pushGeometryUpdate = () => {
      const updateRange = updateRanges.shift();
      if (updateRange) {
        decalMesh.geometry.attributes.position.updateRange = updateRange.position;
        decalMesh.geometry.attributes.position.needsUpdate = true;
        decalMesh.geometry.attributes.uv.updateRange = updateRange.uv;
        decalMesh.geometry.attributes.uv.needsUpdate = true;
        decalMesh.geometry.attributes.normal.updateRange = updateRange.normal;
        decalMesh.geometry.attributes.normal.needsUpdate = true;
      }
    };

    return decalMesh;
  };
  const decalMesh = _makeDecalMesh();
  scene.add(decalMesh);
  class TrailMesh extends THREE.Mesh {
    constructor(a, b, isZ) {
      const planeGeometry = new THREE.BufferGeometry();
      const planeNumber=100;
      let positions = new Float32Array(18*planeNumber);
      planeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      let uv = new Float32Array(12*planeNumber);
      let fraction = 1;
      let ratio = 1 / planeNumber;
      for (let i = 0; i < planeNumber; i++) {
        uv[i * 12 + 0] = 0;
        uv[i * 12 + 1] = fraction;

        uv[i * 12 + 2] = 1;
        uv[i * 12 + 3] = fraction;

        uv[i * 12 + 4] = 0;
        uv[i * 12 + 5] = fraction - ratio;

        uv[i * 12 + 6] = 1;
        uv[i * 12 + 7] = fraction - ratio;

        uv[i * 12 + 8] = 0;
        uv[i * 12 + 9] = fraction - ratio;

        uv[i * 12 + 10] = 1;
        uv[i * 12 + 11] = fraction;

        fraction -= ratio;
      }
      planeGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: {
            value: 0,
          },
          opacity: {
            value: 0,
          },
          textureR: { type: 't', value: textureR },
          textureG: { type: 't', value: textureG },
          textureB: { type: 't', value: textureB },
          t: { value: 0.9 }
        },
        vertexShader: `\
          ${THREE.ShaderChunk.common}
          ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
          uniform float uTime;
          varying vec2 vUv;
          
          void main() {
            vUv=uv;
            vUv.y*=1.0;
            //vUv.x=1.-vUv.x;
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectionPosition = projectionMatrix * viewPosition;
  
            gl_Position = projectionPosition;
            ${THREE.ShaderChunk.logdepthbuf_vertex}
          }
        `,
        fragmentShader: `\
          ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
          uniform sampler2D textureR;
          uniform sampler2D textureG;
          uniform sampler2D textureB;
          uniform float uTime;
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            vec3 texColorR = texture2D(
              textureR,
              vec2(
                mod(1.*vUv.x+uTime*5.,1.),
                mod(2.*vUv.y+uTime*5.,1.)
              )
            ).rgb;  
            vec3 texColorG = texture2D(
              textureG,
              vec2(
                mod(1.*vUv.x+uTime*5.,1.),
                mod(2.*vUv.y+uTime*5.,1.)
              )
            ).rgb;  
            vec3 texColorB = texture2D(
              textureB,
              vec2(
                mod(1.*vUv.x,1.),
                mod(2.5*vUv.y+uTime*2.5,1.)
              )
            ).rgb;  
            gl_FragColor = vec4(texColorB.b)*((vec4(texColorR.r)+vec4(texColorG.g))/2.);
            
            if( gl_FragColor.b >= 0.1 ){
              gl_FragColor = vec4(mix(vec3(0.020, 0.180, 1.920),vec3(0.284, 0.922, 0.980),gl_FragColor.b),gl_FragColor.b);
            }else{
              gl_FragColor = vec4(0.);
            }
            gl_FragColor *= vec4(sin(vUv.y) - 0.1);
            gl_FragColor *= vec4(smoothstep(0.3,0.628,vUv.y));
            if(abs(vUv.x)>0.9 || abs(vUv.x)<0.1)
              gl_FragColor.a=0.;
            
            gl_FragColor.a*=3.;
            gl_FragColor.a*=opacity;
              
            //gl_FragColor = vec4(vec3(texColor), texColor.b);
            //gl_FragColor.a*=(vUv.x)*5.;
            //gl_FragColor = vec4(vUv, 1.0, 1.0);
            // gl_FragColor = vec4(0,1,0,1);
            ${THREE.ShaderChunk.logdepthbuf_fragment}
          }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,

        clipping: false,
        fog: false,
        lights: false,
      });
      material.freeze();
    
      super(planeGeometry, material);
      this.planeNumber = planeNumber;
      this.b = b;
      this.isZ = isZ;
      this.material = material;
      this.positions = positions;
      this.frustumCulled = false;

      this.point1 = new THREE.Vector3();
      this.point2 = new THREE.Vector3();
      this.localVector2 = new THREE.Vector3();
      this.temp = [];
      this.temp2 = [];
      this.pos = new THREE.Vector3();
      this.quat = new THREE.Quaternion();
      this.quat.setFromAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);

      this.lastEnabled = false;
      this.lastTriggerStartTime = -Infinity;
    }
    update(enabled, matrixWorld) {
      const now = performance.now();

      // if (enabled && !this.lastEnabled) {
      //   this.lastTriggerStartTime = now;
      // }
      // now -= this.lastTriggerStartTime;
      // console.log(now);

      if(now>=10){
        this.material.uniforms.opacity.value = 1;
      }
      else{
        if(this.material.uniforms.opacity.value>0)
          this.material.uniforms.opacity.value -= 0.0255;
      }
      if(now>0 && now<10){
        this.material.uniforms.opacity.value = 0;
      }
      if(this.material.uniforms.opacity.value>0){
        //console.log('sonic-boom-horiPlane');
        
        // this.localVector2.set(currentDir.x, currentDir.y, currentDir.z).applyQuaternion(this.quat);
        localQuaternion.setFromRotationMatrix(matrixWorld);
        // this.localVector2.set(0, 0, -1).applyQuaternion(localQuaternion).applyQuaternion(this.quat);
        this.localVector2.set(this.isZ ? 0 : 1, 0, this.isZ ? 1 : 0).applyQuaternion(localQuaternion);
        // this.localVector2.set(0, 0, 1).applyQuaternion(localQuaternion);
        // this.localVector2.set(1, 0, 0);
        this.pos.copy(this.b).applyMatrix4(matrixWorld);
        // console.log(this.pos.toArray().map(n=>n.toFixed(2)).join(', '));

        this.point1.x=this.pos.x;
        this.point1.y=this.pos.y;
        this.point1.z=this.pos.z;
        this.point2.x=this.pos.x;
        this.point2.y=this.pos.y;
        this.point2.z=this.pos.z;
        
        this.point1.x-=0.6*this.localVector2.x;
        this.point1.y-=0.6*this.localVector2.y;
        this.point1.z-=0.6*this.localVector2.z;
        this.point2.x+=0.6*this.localVector2.x;
        this.point2.y+=0.6*this.localVector2.y;
        this.point2.z+=0.6*this.localVector2.z;
        
        for(let i=0;i<18;i++){
          this.temp[i]=this.positions[i];
        }
        for (let i = 0; i < this.planeNumber; i++){
          if(i===0){
            this.positions[0] = this.point1.x;
            this.positions[1] = this.point1.y;
            this.positions[2] = this.point1.z;
            this.positions[3] = this.point2.x;
            this.positions[4] = this.point2.y;
            this.positions[5] = this.point2.z;
        
            this.positions[6] = this.temp[0];
            this.positions[7] = this.temp[1];
            this.positions[8] = this.temp[2];
        
            this.positions[9] = this.temp[3];
            this.positions[10] = this.temp[4];
            this.positions[11] = this.temp[5];
        
            this.positions[12] = this.temp[0];
            this.positions[13] = this.temp[1];
            this.positions[14] = this.temp[2];
        
            this.positions[15] = this.point2.x;
            this.positions[16] = this.point2.y;
            this.positions[17] = this.point2.z;
          }
          else{
            for(let j=0;j<18;j++){
              this.temp2[j]=this.positions[i*18+j];
              this.positions[i*18+j]=this.temp[j];
              this.temp[j]=this.temp2[j];
            }
          }
        }
        
        this.geometry.verticesNeedUpdate = true;
        this.geometry.dynamic = true;
        this.geometry.attributes.position.needsUpdate = true;
        this.material.uniforms.uTime.value = now/1000;
      }
      this.lastEnabled = enabled;
    }
  }
  let trailMesh = null;
  let trailMesh2 = null;
  const useComponent = components.find(component => component.key === 'use');
  const trail = useComponent?.value.trail;
  if (Array.isArray(trail)) {
    const a = new THREE.Vector3().fromArray(trail[0]);
    const b = new THREE.Vector3().fromArray(trail[1]);
    trailMesh = new TrailMesh(a, b);
    trailMesh2 = new TrailMesh(a, b, true);
    window.trailMesh = trailMesh;
    window.trailMesh2 = trailMesh2;
    sceneLowPriority.add(trailMesh);
    sceneLowPriority.add(trailMesh2);
  }

  let subApp = null;
  e.waitUntil((async () => {
    let u2 = baseUrl + 'megasword_v4_texta.glb';
    if (/^https?:/.test(u2)) {
      u2 = '/@proxy/' + u2;
    }
    const m = await metaversefile.import(u2);

    subApp = metaversefile.createApp({
      name: u2,
    });
    window.subApp = subApp
    subApp.name = 'silsword mesh';
    /* subApp.position.copy(app.position);
    subApp.quaternion.copy(app.quaternion);
    subApp.scale.copy(app.scale); */
    app.add(subApp);
    subApp.updateMatrixWorld();
    subApp.contentId = u2;
    subApp.instanceId = app.instanceId;

    for (const {key, value} of components) {
      subApp.setComponent(key, value);
    }
    await subApp.addModule(m);
  })());

  /* useActivate(() => {
    const localPlayer = useLocalPlayer();
    localPlayer.wear(app);
  }); */

  let wearing = false;
  useWear(e => {
    const {wear} = e;
    if (subApp) {
      /* if (!wear) {
        subApp.position.copy(app.position);
        subApp.quaternion.copy(app.quaternion);
        subApp.scale.copy(app.scale);
        subApp.updateMatrixWorld();
      } */

      /* subApp.dispatchEvent({
        type: 'wearupdate',
        wear,
      }); */
    }
    wearing = !!wear;
  });

  let using = false;
  useUse(e => {
    using = e.use;
  });

  let animationOffset={
    'swordSideSlash':350,
    'swordSideSlashStep':150,
    'swordTopDownSlash':100,
    'swordTopDownSlashStep':150
  }
  let startAnimationTime=0;
  let playSoundSw=false;
  let lastPlaySoundAnimationIndex = null;
  useFrame(() => {
    const localPlayer = useLocalPlayer();
    if(localPlayer.avatar && wearing){
      if(localPlayer.avatar.useAnimationIndex >= 0 && localPlayer.avatar.useAnimationIndex !== lastPlaySoundAnimationIndex){
        if(startAnimationTime===0){
          startAnimationTime=performance.now();
        }
        if(
          performance.now()-startAnimationTime>=animationOffset[localPlayer.avatar.useAnimationCombo[localPlayer.avatar.useAnimationIndex]]
          && !playSoundSw
        ){
          const indexOfSlash=localPlayer.avatar.useAnimationIndex;
          sounds.playSound(soundFiles.combat[soundIndex+(4*indexOfSlash+Math.floor(Math.random()*4))]);
          localPlayer.characterSfx.playGrunt('attack');
          playSoundSw=true;
          lastPlaySoundAnimationIndex = localPlayer.avatar.useAnimationIndex;
        }
      }
      else{
        playSoundSw=false;
        startAnimationTime=0;
      }
      if (!(localPlayer.avatar.useAnimationIndex >= 0)) lastPlaySoundAnimationIndex = null;
    }
    /* if (!wearing) {
      if (subApp) {
        subApp.position.copy(app.position);
        subApp.quaternion.copy(app.quaternion);
        subApp.updateMatrixWorld();
      }
    } else {
      if (subApp) {
        app.position.copy(subApp.position);
        app.quaternion.copy(subApp.quaternion);
        app.updateMatrixWorld();
      }
    } */

    if (trailMesh && subApp) {
      trailMesh.update(using, subApp.matrixWorld);
      trailMesh2.update(using, subApp.matrixWorld);
    }
    if (decalMesh) {
      //const localPlayer = useLocalPlayer();
      if (subApp && localPlayer.avatar) {
        decalMesh.update(using, subApp.matrixWorld, localPlayer.avatar.modelBones.Right_arm.matrixWorld);
      }

      decalMesh.pushGeometryUpdate();
    }
  });

  useCleanup(() => {
    trailMesh && sceneLowPriority.remove(trailMesh);
    trailMesh2 && sceneLowPriority.remove(trailMesh2);
    decalMesh && scene.remove(decalMesh);
    subApp && subApp.destroy();
  });

  app.getPhysicsObjects = () => subApp ? subApp.getPhysicsObjects() : [];

  return app;
};