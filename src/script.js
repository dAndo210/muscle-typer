// 文章をAI生成
// async : 非同期処理（同時処理を可能にする）
async function generateAIDocument() {
    // return "文章生成無効化"
    const apiKey = import.meta.env.VITE_API_KEY;   //隠蔽
    console.log(apiKey);
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    console.log("文章生成中...");    

    // awaitで文の生成を待つ
    const response = await fetch(`${endpoint}?key=${apiKey}`,{
        method:"POST",
        headers:{
            "Content-Type": "application/json"
        },
        body:JSON.stringify({
            // contents:会話の履歴
            // parts:テキスト、画像、音声の送信形式
            // text:テキスト
            contents: [{
                 parts: [{
                    text: "ランダムな30字程度の日本語の文章を1つ出力して" + 
                    "制約事項:" + 
                    "1.挨拶や解説、文字数カウントなどは一切不要" + 
                    "2.「お題となる文章そのもの」だけ出力して" +
                    "3.**などの記号など本文と関係ない装飾は行わないでください"
                }]}]
        })
    });

    if(!response.ok){
        const errorDetail = await response.json();
        console.error("APIエラー:", errorDetail);
        return "文章の取得に失敗しました";
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

const displayTargetText = (correctText) => {
    const displayTarget = document.querySelector(".target-text p");
    displayTarget.textContent = correctText;
}

const countMistake = (currentLength, lastLength, countDeletedText) => { 

    // 削除した文字数をカウント
    const deletedCount = lastLength - currentLength;

    if(deletedCount > 0){
        countDeletedText += deletedCount;
    }

    return countDeletedText;
}

const resultDisplay = (clearTime, countDeletedText, stomachTemp) => {

    // 結果表示画面を隠すcssを解除
    resultScreen.classList.remove("hidden");
    
    // html上に表示
    const displayClearTime = document.getElementById("elapsed-time");
    const displayMistake = document.getElementById("mistake-count");
    const displayStomachScore = document.querySelector(".stomach-temp");
    displayClearTime.textContent = clearTime;
    displayMistake.textContent = countDeletedText;
    displayStomachScore.textContent = stomachTemp;
}

// ノルマのゲージを動かす
const gaugeMoving = (stomachRate) => {
    const fillBar = document.querySelector(".fill-bar");
    const percent = document.querySelector(".gauge-container p");
    // CSSのwidthを取得
    fillBar.style.width = stomachRate + "%";
    percent.textContent = stomachRate + "%";
}

// 満点から減算して満腹度の上昇量を計算
const calculateSatietyLevel = (clearTime, countDeletedText) => {
    
    const upperLimit = 50;      //満点
    const mistakeWeight = 2;    //ミス１回あたりの減点
    const timeWeight = 1;       //２秒当たりの減点
    const minScore = 20;        //最低点
    let perfectBonus = 10;      //ミス0ボーナス

    const penalty = (countDeletedText * mistakeWeight) + ((clearTime / 3) * timeWeight);
    const finalIncrease = upperLimit - penalty;

    // ミスがあればボーナスをなくす
    if(countDeletedText != 0){
        perfectBonus = 0;
    }

    // 合計点が最低点未満であれば、最低点を戻り値にする
    return Math.max(minScore, Math.round(finalIncrease) + perfectBonus);
}

// 上昇ノルマの0.2倍、localStorageの筋肉を増やす
const bicepIncreasing = (stomachTemp, stomachRate) => {
    let bicepIncrease;
    // ノルマが100%になった後にプレイしても筋肉が発達しないようにする
    if(stomachRate + stomachTemp <= 100){
        // 1倍(力こぶの成長スピード)
        const increaseRate = 1;
        bicepIncrease = Math.floor(stomachTemp * increaseRate);
    }
    else if(stomachRate < 100 && stomachRate + stomachTemp > 100){
        bicepIncrease = Math.floor((100 - stomachRate) * increaseRate);
    }
    else{
        return;
    }
    // localStorageの筋肉サイズを変更
    muscleSize += bicepIncrease;
    localStorage.setItem("muscleSize", muscleSize);

    updateMuscleUI();
}

// 筋肉の大きさを画面に反映させる
const updateMuscleUI = () => {
    const kobuRectangle = document.querySelector(".kobu-rectangle");
    const kobuCircle = document.querySelector(".kobu-circle");
    
    // nullの要素を弄っちゃうのを防ぐ
    if (kobuRectangle && kobuCircle) {
        // それぞれの「初期値（ベースの数値）」を設定する
        const baseHeight = 40;  // 四角形の最初の高さ
        const baseBottom = 65; // 円の最初の高さ（四角形のてっぺんに少しめり込む位置）

        kobuRectangle.style.height = (baseHeight + muscleSize) + "px";
        kobuCircle.style.bottom = (baseBottom + muscleSize) + "px";
    }
}

/* ----- main ----- */

// 保存されてるノルマ（stomachRate）を読み込む
// nullの時は初期値20
let savedRate = localStorage.getItem("stomachRate");
let stomachRate = (savedRate === null) ? 20 : Number(savedRate);
console.log(`前回のノルマ：${stomachRate}`);
// 筋肉のサイズを保存
let savedSize = localStorage.getItem("muscleSize");
let muscleSize = (savedSize === null) ? 20 : Number(savedSize);
console.log(`筋肉のサイズ：${muscleSize}`);
// 前回のプレイ時刻(savedLastTime)を読み込む
let savedLastTime = localStorage.getItem("savedLastTime");
console.log(`前回のプレイ時刻：${savedLastTime}`);
console.log(`現在時刻：${Date.now()}`);

let stomachTemp = 0;
let correctText = "";
let standbyText = "";
let lastLength = 0;
// 現在時刻
let nowTime = 0;
let startTime = 0;
let endTime = 0;
// クリアタイム
let clearTime = 0;
// 消した文字数  
let countDeletedText = 0;
let isBackspacePressed = false;

const startScreen = document.querySelector(".title-container");
const nurturingScreen = document.querySelector(".nurturing-container");
const loadingScreen = document.getElementById("loading-container");
const mainGame = document.querySelector(".game-container");
const resultScreen = document.getElementById("result-wrapper");

// ページ読み込み時に1回実行しておく
window.addEventListener('DOMContentLoaded', () => {
    updateMuscleUI();
});

// 1.savedLastTimeがnullでなければ、さぼった時間からノルマ値を減らす
// 2.筋肉を減らす処理
// 3.savedLastTime(前回の時刻)を更新
if(savedLastTime){
    // 1
    // 現在時刻
    nowTime = Date.now();
    // 「さぼった時間」（restSeconds）をミリ秒→秒に直す
    let restSeconds = (nowTime - Number(savedLastTime)) / 1000;
    let lastTimeNum = Number(savedLastTime);
    // ノルマを時間経過で減少させるようにする（15分（900秒）で1%減らす）
    const quotaReduction = Math.floor(restSeconds / 900);

    if(quotaReduction > 0){
        // ノルマをコピー
        // コピー変数により、ノルマが0になった時を基準として筋肉を減らせるようにする
        let intervalsToZeroQuota = stomachRate;
        // 最低値は０
        stomachRate = Math.min(100, Math.max(0, stomachRate - quotaReduction));

        // まだノルマが０になってない場合
        if(quotaReduction < intervalsToZeroQuota){
            //次に使えるよう0にする
            restSeconds -= quotaReduction * 900;    
            //よくわからん
            lastTimeNum += quotaReduction * 900 * 1000 
        }
        // ノルマが0になり、さらに時間が経過してる場合
        else{
            stomachRate = 0;
            // 「ノルマを0にするため」に消費した時間だけを引く
            restSeconds -= intervalsToZeroQuota * 900;
            // よくわからん
            lastTimeNum += intervalsToZeroQuota * 900 * 1000;
        }
    }
    // 「stomachRate」ストレージにstomachRate変数の値を保存する
    localStorage.setItem("stomachRate", stomachRate);


    // 2.筋肉の減少処理（ノルマが0になり、さらに時間が経過してる場合）
    if(stomachRate == 0 && restSeconds > 0){
        // 筋肉減少（1時間で10px）
        const muscleReduction = Math.floor(restSeconds / 3600) * 10

        if(muscleReduction > 0){
            // localStorageの中身が0にならない範囲で減少させる
            muscleSize = Math.max(0, muscleSize - muscleReduction);
            localStorage.setItem("muscleSize", muscleSize);

            // 3.
            const consumedTime = Math.floor(restSeconds / 3600) * 3600 * 1000
            // majidewakaran(15×a分+b分のb分までちゃんと管理できるようにしてあるっぽい)
            lastTimeNum += consumedTime
        }
    }
    localStorage.setItem("savedLastTime", lastTimeNum);
}

const startButton = document.getElementsByClassName("btn start")[0];

startButton.addEventListener("click", async () => {
    standbyText = generateAIDocument();
    // あらかじめ初期化（リプレイ時に備えて）
    // タイトル画面を隠す
    startScreen.classList.add("hidden");
    nurturingScreen.classList.remove("hidden"); 
    gaugeMoving(stomachRate);

});

const playButton = document.querySelector(".main");

playButton.addEventListener("click", async () => {
    nurturingScreen.classList.add("hidden");
    loadingScreen.classList.remove("hidden");
    // 文章生成
    correctText = await standbyText;
    // ゲーム画面を表示
    clearTime = 0;
    countDeletedText = 0;
    inputArea.value = "";   //入力欄を空にする
    loadingScreen.classList.add("hidden");
    mainGame.classList.remove("hidden");
    displayTargetText(correctText);
    inputArea.focus();
    startTime = performance.now();
    // プレイ中に文章を生成
    standbyText = generateAIDocument();
});

const inputArea = document.getElementsByClassName("input-document")[0];

// テキストエリア内にオートフォーカス
inputArea.addEventListener("blur", () => {
    inputArea.focus();
});

// backspaceが押されたことを感知
inputArea.addEventListener("keydown", (event) => {
    //.codeは押されたキーそのものを示す
    if(event.code == "Backspace"){
        isBackspacePressed = true;
        lastLength = inputArea.value.length;
    }
});

// 正誤判定・誤字数カウント
inputArea.addEventListener("input", () => {
    
    const currentText = inputArea.value;
    const currentLength = currentText.length;
    
    if(isBackspacePressed){
        countDeletedText = countMistake(currentLength, lastLength, countDeletedText);
        isBackspacePressed = false;
    }
    
    if(currentText == correctText){
        // タイム計測
        endTime = performance.now();
        clearTime = ((endTime - startTime) / 1000).toFixed(2);
        // ノルマを計算、保存
        stomachTemp = calculateSatietyLevel(clearTime, countDeletedText);
        // 筋肉の発達をここで行う
        bicepIncreasing(stomachTemp,stomachRate);
        stomachRate = Math.min(100, stomachRate + stomachTemp);
        // ノルマをブラウザに保存
        localStorage.setItem("stomachRate", stomachRate);
        // 時刻を保存
        localStorage.setItem("savedLastTime", Date.now());
        mainGame.classList.add("hidden");
        resultDisplay(clearTime, countDeletedText, stomachTemp);
    }
    
    lastLength = currentLength;
});

const retryButton = document.getElementsByClassName("btn retry")[0];

// リトライボタン押下時の動作
retryButton.addEventListener("click", async() => {
    // あらかじめ初期化（リプレイ時に備えて）
    clearTime = 0;
    countDeletedText = 0;
    resultScreen.classList.add("hidden");
    loadingScreen.classList.remove("hidden");
    // 文章生成
    correctText = await standbyText;
    // ゲーム画面を表示
    inputArea.value = "";
    loadingScreen.classList.add("hidden");
    mainGame.classList.remove("hidden");
    displayTargetText(correctText);
    inputArea.focus();
    startTime = performance.now();
    standbyText = generateAIDocument();
});

const resultToTitleButton = document.getElementsByClassName("btn resulttotitle")[0];

resultToTitleButton.addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
});

const nurturToformerResult = document.querySelector(".former");

nurturToformerResult.addEventListener("click", () => {
    nurturingScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
})

const nurturToTitleButton = document.getElementsByClassName("btn nurturtotitle")[0];

nurturToTitleButton.addEventListener("click", () => {
        nurturingScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
});

const backNurturingButton = document.querySelector(".nurtur");

backNurturingButton.addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    nurturingScreen.classList.remove("hidden");
    gaugeMoving(stomachRate);
});