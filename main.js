
// 定数の設定
const TREE_HEIGHT = 6; // ツリーの高さ
const TREE_RADIUS = 2; // ツリーの半径
const ORNAMENTS_COUNT = 25; // オーナメントの総数
const SPIRAL_TURNS = 4; // 螺旋の巻数
const STEPS = 1000; // 数値積分のステップ数
const DEFAULT_TEXTURE = 'default_texture.png';

let bats = [];
const clock = new THREE.Clock(); // 羽ばたき＆周回アニメ用

// 螺旋上の点の3D座標を取得する関数
function getSpiralPointCoordinates(treeHeight, treeRadius, spiralTurns, steps, fraction) {
    // 総螺旋の長さを計算
    // 螺旋の長さを計算するための積分処理
    let totalLength = 0;
    let dTheta = (2 * Math.PI * spiralTurns) / steps;

    for (let i = 0; i < steps; i++) {
        let startTheta = i * dTheta;
        let endTheta = (i + 1) * dTheta;
        // 台形則による数値積分
        totalLength += (spiralLengthDifferential(startTheta) + spiralLengthDifferential(endTheta)) / 2 * dTheta;
    }

    const totalSpiralLength = totalLength;

    // 目的の距離を計算
    const targetDistance = totalSpiralLength * fraction;

    // 現在の距離と角度
    let currentDistance = 0;
    let currentAngle = 0;

    // 螺旋の半径を計算する関数
    function spiralRadius(theta) {
        let z = (treeHeight / (2 * Math.PI * spiralTurns)) * theta;
        return treeRadius * (1 - z / treeHeight);
    }

    // 螺旋の長さの微分を計算する関数
    function spiralLengthDifferential(theta) {
        let dr_dtheta = -treeHeight / (2 * Math.PI * spiralTurns) * treeRadius / treeHeight;
        let dz_dtheta = treeHeight / (2 * Math.PI * spiralTurns);
        let r = spiralRadius(theta);

        // dx/dtheta, dy/dtheta, dz/dtheta の計算
        let dx_dtheta = dr_dtheta * Math.cos(theta) - r * Math.sin(theta);
        let dy_dtheta = dr_dtheta * Math.sin(theta) + r * Math.cos(theta);

        // 曲線の微小区間の長さを計算
        return Math.sqrt(dx_dtheta * dx_dtheta + dy_dtheta * dy_dtheta + dz_dtheta * dz_dtheta);
    }

    // 螺旋をたどる
    for (let i = 0; i < steps; i++) {
        let startTheta = i * dTheta;
        let endTheta = (i + 1) * dTheta;
        let segmentLength = (spiralLengthDifferential(startTheta) + spiralLengthDifferential(endTheta)) / 2 * dTheta;

        // 次のポイントが目的の距離を超える場合、そのセグメント上で目的の点を見つける
        if (currentDistance + segmentLength >= targetDistance) {
            // 目的の点までの残りの距離
            let remainingDistance = targetDistance - currentDistance;
            // 残りの距離から角度の増分を計算
            let deltaTheta = remainingDistance / spiralLengthDifferential(startTheta);
            currentAngle = startTheta + deltaTheta;

            // 螺旋の半径と高さを計算
            let z = (treeHeight / (2 * Math.PI * spiralTurns)) * currentAngle;
            let r = treeRadius * (1 - z / treeHeight);

            // 3D座標を計算
            let x = r * Math.cos(currentAngle);
            let y = r * Math.sin(currentAngle);

            // 目的の3D座標を返す
            return { x: x, y: z, z: y };
        }

        // 現在の距離を更新
        currentDistance += segmentLength;
    }

    // 目的の距離が螺旋の長さを超えている場合、最終的な座標を返す
    let z = treeHeight / 2; // 螺旋の最高点
    let r = 0; // 最高点での半径は0
    let x = r * Math.cos(currentAngle);
    let y = r * Math.sin(currentAngle);
    return { x: x, y: z, z: y };
}

// 星形のジオメトリを作成
function createStarShape() {
    const shape = new THREE.Shape();
    const outerRadius = 0.6; // 星の外側の半径
    const innerRadius = 0.3; // 星の内側の半径
    const numPoints = 5;

    for (let i = 0; i < numPoints * 2; i++) {
        const angle = (i * Math.PI * 2) / (numPoints * 2);
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }

    shape.closePath();
    return shape;
}

// 魔女の帽子を作成
function createWitchHat() {
    const hatGroup = new THREE.Group();

    // 円錐部分（とんがり）
    const coneGeometry = new THREE.ConeGeometry(0.35, 0.75, 16);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = 0.375; // 高さの半分持ち上げて中心を合わせる
    hatGroup.add(cone);

    // つば部分（円盤）
    const brimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
    const brimMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const brim = new THREE.Mesh(brimGeometry, brimMaterial);
    brim.position.y = 0; // 底に配置
    hatGroup.add(brim);

    return hatGroup;
}
let ornaments = []
// コウモリを飛ばす
function createBat() {
    const bat = new THREE.Group();

    // 胴体
    const bodyGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    bat.add(body);

    // 翼（薄い板：三角に近い矩形を回転させて表現）
    const wingGeo = new THREE.PlaneGeometry(0.45, 0.18);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);

    leftWing.position.set(-0.25, 0, 0);
    rightWing.position.set(0.25, 0, 0);
    // 初期角度（少し下げておく）
    leftWing.rotation.y = Math.PI * 0.05;
    rightWing.rotation.y = -Math.PI * 0.05;

    bat.add(leftWing);
    bat.add(rightWing);

    // 羽にアクセスしやすいように保存
    bat.userData.leftWing = leftWing;
    bat.userData.rightWing = rightWing;

    return bat;
}

// テクスチャとシーンを更新する関数
function updateSceneWithNewTexture(scene) {

    // ハロウィンツリーを再度追加
    let treeGeometry = new THREE.ConeGeometry(TREE_RADIUS, TREE_HEIGHT, 32);
    let treeMaterial = new THREE.MeshBasicMaterial({ color: 0x004000 });
    let tree = new THREE.Mesh(treeGeometry, treeMaterial);
    scene.add(tree);

    // 旧：雪パーティクル生成を削除し、コウモリ生成に変更
    const BAT_COUNT = 13;
    for (let i = 0; i < BAT_COUNT; i++) {
        const bat = createBat();

        // ツリー周囲を周回させるためのパラメータを仕込む
        // 半径・高度・速度・位相はランダムにして群れっぽく
        bat.userData.orbitRadius = THREE.MathUtils.randFloat(TREE_RADIUS * 0.8, TREE_RADIUS * 1.6);
        bat.userData.orbitHeight = THREE.MathUtils.randFloat(-TREE_HEIGHT * 0.05, TREE_HEIGHT * 0.45);
        bat.userData.orbitSpeed  = THREE.MathUtils.randFloat(0.4, 1.0);   // 角速度の係数
        bat.userData.phase       = Math.random() * Math.PI * 2;
        bat.userData.flapSpeed   = THREE.MathUtils.randFloat(6.0, 9.0);    // 羽ばたき速度
        bat.userData.flapAmp     = THREE.MathUtils.degToRad(28);           // 羽ばたき振幅（±角度）

        // 初期位置（位相で決める）
        const theta = bat.userData.phase;
        bat.position.set(
            Math.cos(theta) * bat.userData.orbitRadius,
            bat.userData.orbitHeight,
            Math.sin(theta) * bat.userData.orbitRadius
        );

        // 進行方向を向かせる（ツリー中心(0, y, 0)を基準に接線方向へ）
        const dir = new THREE.Vector3(
            -Math.sin(theta), 0, Math.cos(theta)
        ).normalize();
        const lookAtPos = new THREE.Vector3().copy(bat.position).add(dir);
        bat.lookAt(lookAtPos);

        bats.push(bat);
        scene.add(bat);
    }

    // 雪を配置
    let particleGeometry = new THREE.BufferGeometry();
    const particles = 1000;
    const positions = [];

    for (let i = 0; i < particles; i++) {
        // ツリーの底から頂上までの高さの比率をランダムに決定
        let y = Math.random();

        // ツリーの底の半径から頂点の半径までの間でランダムに半径を決定
        let r = TREE_RADIUS * (1 - y); // yが0なら底の半径、yが1なら0（頂点）

        // パーティクルのx, z位置をランダムに決定（円錐の断面内）
        let theta = Math.random() * Math.PI * 2; // 円周上のランダムな角度
        let x = r * Math.cos(theta);
        let z = r * Math.sin(theta);

        // パーティクルの高さを決定（底からの距離）
        y *= TREE_HEIGHT; // ツリーの高さに比率を乗じる

        // 頂点からの逆比率でスケールダウンしていく
        positions.push(x, y - TREE_HEIGHT / 2, z); // yの位置を調整
    }

    // positions配列から属性を作成
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    let particleMaterial = new THREE.PointsMaterial({
        color: 0x008000,
        size: 0.2,
        transparent: true, // 透明度を有効にする
        opacity: 0.6        // 透明度の値を設定（0: 完全に透明, 1: 完全に不透明）
    });
    let particlesMesh = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particlesMesh);

    // 星形のメッシュを作成
    // const starShape = createWitchHat();
    // const extrudeSettings = {
    //     steps: 1,
    //     depth: 0.1,
    //     bevelEnabled: false
    // };
    // const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    // const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    // const star = new THREE.Mesh(starGeometry, starMaterial);

    // 星を円錐の頂上に配置
    // star.position.y = TREE_HEIGHT / 2 + 0.6; // 星を円錐の少し上に配置
    // star.rotation.z = Math.PI / 2; // 星をX軸周りに90度回転
    // scene.add(star);

    const witchHat = createWitchHat();
    witchHat.position.y = TREE_HEIGHT / 2 + 0.1; // ツリーの上に配置
    scene.add(witchHat);

    let segmentHeight = 1 / 5;

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            // 飾りの作成
            let ornamentGeometry = new THREE.PlaneGeometry(0.8, 0.8);
            let ornamentMaterial = new THREE.MeshBasicMaterial({
                // map: ornamentTexture,
                side: THREE.DoubleSide,
                alphaTest: 0.5, // 透明度の閾値を設定（0.0から1.0までの値）
                transparent: true // 透明度を有効にする
            });
            let ornament = new THREE.Mesh(ornamentGeometry, ornamentMaterial);

            let a = getSpiralPointCoordinates(TREE_HEIGHT, TREE_RADIUS, SPIRAL_TURNS, STEPS, (i*5+j) / ORNAMENTS_COUNT)

            // オーナメントの位置を設定
            ornament.position.set(a.x, a.y+segmentHeight * 2 - TREE_HEIGHT / 2, a.z);

            // オーナメントをツリーの中心から外側に向ける
            ornament.lookAt(new THREE.Vector3(ornament.position.x*2, ornament.position.y, ornament.position.z*2));
            ornaments[i*5 + j] = ornament
            scene.add(ornaments[i*5 + j]);
        }
    }
}

let texture
function updateTexture(newTexture) {
    texture = newTexture
    let segmentWidth = 1 / 5;
    let segmentHeight = 1 / 5;

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    const a = [
        [2,2],
        [2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[1,2],[1,1],
        [2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[3,4],
        [2,4],[1,4],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],
    ]

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            // 新しいテクスチャを各オーナメントに適用
            ornaments[i * 5 + j].material.map = texture;
            const b=a[24-(i * 5 + j)]
            // UV座標の配列を作成
            const uvs = [];
            // 左下、左上、右上、右下の順でUV座標を設定
            uvs.push(b[0] * segmentWidth, (b[1]+1) * segmentHeight); // 左上
            uvs.push((b[0]+1) * segmentWidth, (b[1]+1) * segmentHeight); // 右上
            uvs.push(b[0] * segmentWidth, b[1] * segmentHeight); // 左下
            uvs.push((b[0]+1) * segmentWidth, b[1] * segmentHeight); // 右下

            // ジオメトリのuv属性を新しい配列で更新
            ornaments[i * 5 + j].geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
            ornaments[i * 5 + j].material.needsUpdate = true;
        }
    }
}

// カメラの作成
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7;

// レンダラーの作成
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 背景を透明に設定
renderer.setClearColor(0x00FF00); // 背景色を黒（0x000000）で透明度0に
document.body.appendChild(renderer.domElement);

// OrbitControlsの作成
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // インタラクティブな動きに抵抗（ダンピング）を追加
controls.dampingFactor = 0.25; // ダンピングの量
controls.enableZoom = true; // ズームを有効にする
controls.autoRotate = true; // カメラの自動回転を有効にする
controls.autoRotateSpeed = 0.5; // 自動回転の速度

// シーンの作成
let scene = new THREE.Scene();

// 画像を読み込む
function loadInitialTexture(imagePath) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, function(texture) {
        // テクスチャが正しく読み込まれた後にシーンを更新
        updateTexture(texture);
    },null , function(error) {
        // テクスチャ読み込み時のエラー処理
        console.error('テクスチャの読み込みに失敗しました:', error);
    });
}

updateSceneWithNewTexture(scene);
loadInitialTexture(DEFAULT_TEXTURE)

document.addEventListener('dragover', function(event) {
    event.preventDefault();
}, false);

document.addEventListener('drop', function(event) {
    event.preventDefault();
    let file = event.dataTransfer.files[0];
    handleFile(file);
}, false);

document.getElementById('fileInput').addEventListener('change', function(event) {
    event.preventDefault();
    if (!event.target.files || event.target.files.length === 0) {
        return; // ファイルが選択されていない場合、ここで処理を終了
    }
    let file = event.target.files[0];
    handleFile(file);
});
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        let dataUri = event.target.result;
        loadInitialTexture(dataUri)
    };
    reader.readAsDataURL(file);
}

// レンダリングループ
function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    // コウモリの群れを更新
    for (const bat of bats) {
        const r = bat.userData.orbitRadius;
        const h = bat.userData.orbitHeight;
        const w = bat.userData.orbitSpeed;
        const phi = bat.userData.phase;

        // 角度を時間で進める
        const theta = phi + t * w;

        // 周回（水平円運動）
        bat.position.set(
            Math.cos(theta) * r,
            h + Math.sin(t * 0.6 + phi) * 0.06, // わずかに上下動
            Math.sin(theta) * r
        );

        // 進行方向に機体を向ける
        const dir = new THREE.Vector3(
            -Math.sin(theta), 0, Math.cos(theta)
        ).normalize();
        const lookAtPos = new THREE.Vector3().copy(bat.position).add(dir);
        bat.lookAt(lookAtPos);

        // 羽ばたき（左右の翼を対称に上下回転）
        const flap = Math.sin(t * bat.userData.flapSpeed) * bat.userData.flapAmp;
        bat.userData.leftWing.rotation.z  =  flap;
        bat.userData.rightWing.rotation.z = -flap;
    }

    // 既存のOrbitControls更新＆描画
    controls.update();
    renderer.render(scene, camera);
}
animate();
