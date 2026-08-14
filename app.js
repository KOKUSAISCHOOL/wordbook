"use strict";


/* ==============================
   상태값
============================== */

let allWords = [];
let currentWords = [];
let currentIndex = 0;
let answerVisible = false;

/* ==============================
   상태값 자동학습
============================== */

let autoLearning = false;
let autoLearningSeconds = 3;
let autoLearningTimer = null;
let autoLearningPhase = "question";

const MIN_AUTO_SECONDS = 1;
const MAX_AUTO_SECONDS = 10;


/*
    currentMode 값

    week:
    일반 주차 학습

    all-favorites:
    메인 화면에서 들어온 전체 즐겨찾기

    week-favorites:
    특정 주차에서 들어온 해당 주차 즐겨찾기
*/
let currentMode = "week";

/*
    현재 선택한 주차를 기억한다.
    주차 안에서 즐겨찾기를 눌렀을 때 사용한다.
*/
let selectedWeek = "";

const FAVORITES_KEY = "japanese-wordbook-favorites-v1";


/* ==============================
   HTML 요소
============================== */

const weekScreen =
    document.getElementById("week-screen");

const studyScreen =
    document.getElementById("study-screen");

const weekList =
    document.getElementById("week-list");

const weekTitle =
    document.getElementById("week-title");

const currentNumber =
    document.getElementById("current-number");

const totalNumber =
    document.getElementById("total-number");

const cardContent =
    document.getElementById("card-content");

const kanji =
    document.getElementById("kanji");

const hiragana =
    document.getElementById("hiragana");

const meaning =
    document.getElementById("meaning");

const answerArea =
    document.getElementById("answer-area");

const backButton =
    document.getElementById("back-button");

const previousButton =
    document.getElementById("previous-button");

const nextButton =
    document.getElementById("next-button");

const shuffleButton =
    document.getElementById("shuffle-button");

const favoriteButton =
    document.getElementById("favorite-button");

const favoriteListButton =
    document.getElementById("favorite-list-button");

const mainFavoriteButton =
    document.getElementById("main-favorite-button");

const naverDictionaryButton =
    document.getElementById("naver-dictionary-button");

const autoMinusButton =
    document.getElementById("auto-minus-button");

const autoLearningButton =
    document.getElementById("auto-learning-button");

const autoPlusButton =document.getElementById("auto-plus-button");
/* ==============================
   단어 데이터 불러오기
============================== */

async function loadWords() {
    try {
        const response = await fetch(
            `words.json?version=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `단어 데이터 조회 실패: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "words.json의 데이터 형식이 올바르지 않습니다."
            );
        }

        allWords = data.filter(isValidWord);

        if (allWords.length === 0) {
            throw new Error("등록된 단어가 없습니다.");
        }

        renderWeekList();

    } catch (error) {
        console.error(error);

        weekList.innerHTML = `
            <div class="error-message">
                단어 데이터를 불러오지 못했습니다.<br>
                잠시 후 새로고침해 주세요.
            </div>
        `;
    }
}


function isValidWord(item) {
    return (
        item &&
        typeof item === "object" &&
        String(item.week || "").trim() !== "" &&
        String(item.kanji || "").trim() !== "" &&
        String(item.hiragana || "").trim() !== "" &&
        String(item.meaning || "").trim() !== ""
    );
}


/* ==============================
   주차 목록
============================== */

function renderWeekList() {
    weekList.innerHTML = "";

    const groupedWeeks = {};

    allWords.forEach((item) => {
        const weekName =
            String(item.week).trim();

        if (!groupedWeeks[weekName]) {
            groupedWeeks[weekName] = [];
        }

        groupedWeeks[weekName].push(item);
    });

    const weekNames =
        Object.keys(groupedWeeks).reverse();

    weekNames.forEach((weekName) => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "week-item";

        const title =
            document.createElement("span");

        title.className = "week-item-title";
        title.textContent = weekName;

        const count =
            document.createElement("span");

        count.className = "week-item-count";
        count.textContent =
            `단어 ${groupedWeeks[weekName].length}개`;

        button.appendChild(title);
        button.appendChild(count);

        button.addEventListener("click", () => {
            openWeek(weekName);
        });

        weekList.appendChild(button);
    });
}


/* ==============================
   일반 주차 학습
============================== */

function openWeek(weekName) {
    stopAutoLearning();
    currentMode = "week";
    selectedWeek = weekName;

    currentWords = allWords.filter(
        (item) =>
            String(item.week).trim() === weekName
    );

    currentIndex = 0;

    weekTitle.textContent = weekName;

    showStudyScreen();
    showCurrentWord();
}


/* ==============================
   즐겨찾기 저장·조회
============================== */

function getWordId(item) {
    return [
        String(item.week || "").trim(),
        String(item.kanji || "").trim(),
        String(item.hiragana || "").trim(),
        String(item.meaning || "").trim()
    ].join("||");
}


function getFavorites() {
    try {
        const saved =
            localStorage.getItem(FAVORITES_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {
        console.error(
            "즐겨찾기를 불러오지 못했습니다.",
            error
        );

        return [];
    }
}


function saveFavorites(favorites) {
    try {
        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favorites)
        );

    } catch (error) {
        console.error(
            "즐겨찾기를 저장하지 못했습니다.",
            error
        );
    }
}


function isFavorite(item) {
    const favorites = getFavorites();
    const wordId = getWordId(item);

    return favorites.includes(wordId);
}


/* ==============================
   즐겨찾기 추가·해제
============================== */

function toggleFavorite() {
    if (currentWords.length === 0) {
        return;
    }

    const item = currentWords[currentIndex];
    const wordId = getWordId(item);

    let favorites = getFavorites();

    if (favorites.includes(wordId)) {
        favorites = favorites.filter(
            (savedId) => savedId !== wordId
        );
    } else {
        favorites.push(wordId);
    }

    saveFavorites(favorites);

    /*
        즐겨찾기 전용 화면에서 별을 해제했다면
        현재 즐겨찾기 목록을 다시 만든다.
    */
    if (
        currentMode === "all-favorites" ||
        currentMode === "week-favorites"
    ) {
        refreshCurrentFavorites();

        if (currentWords.length === 0) {
            showEmptyFavorites();
            return;
        }

        if (currentIndex >= currentWords.length) {
            currentIndex =
                currentWords.length - 1;
        }

        showCurrentWord();
        return;
    }

    updateFavoriteButton();
}


function updateFavoriteButton() {
    if (currentWords.length === 0) {
        favoriteButton.classList.add("hidden");
        return;
    }

    favoriteButton.classList.remove("hidden");

    const item = currentWords[currentIndex];
    const favorite = isFavorite(item);

    favoriteButton.textContent =
        favorite ? "★" : "☆";

    favoriteButton.classList.toggle(
        "active",
        favorite
    );

    favoriteButton.setAttribute(
        "aria-label",
        favorite
            ? "즐겨찾기 해제"
            : "즐겨찾기 추가"
    );

    favoriteButton.setAttribute(
        "title",
        favorite
            ? "즐겨찾기 해제"
            : "즐겨찾기 추가"
    );
}


/* ==============================
   전체 즐겨찾기
============================== */

function openAllFavorites() {
    stopAutoLearning();
    currentMode = "all-favorites";
    currentIndex = 0;

    refreshAllFavorites();

    weekTitle.textContent = "전체 즐겨찾기";

    showStudyScreen();

    if (currentWords.length === 0) {
        showEmptyFavorites();
        return;
    }

    enableStudyControls();
    showCurrentWord();
}


function refreshAllFavorites() {
    const favorites = getFavorites();

    currentWords = allWords.filter((item) => {
        return favorites.includes(
            getWordId(item)
        );
    });
}


/* ==============================
   현재 주차 즐겨찾기
============================== */

function openWeekFavorites() {
    stopAutoLearning();
    /*
        주차를 먼저 선택하지 않은 상태에서는
        전체 즐겨찾기로 연결한다.
    */
    if (!selectedWeek) {
        openAllFavorites();
        return;
    }

    currentMode = "week-favorites";
    currentIndex = 0;

    refreshWeekFavorites();

    weekTitle.textContent =
        `${selectedWeek} 즐겨찾기`;

    showStudyScreen();

    if (currentWords.length === 0) {
        showEmptyFavorites();
        return;
    }

    enableStudyControls();
    showCurrentWord();
}


function refreshWeekFavorites() {
    const favorites = getFavorites();

    currentWords = allWords.filter((item) => {
        const itemWeek =
            String(item.week || "").trim();

        return (
            itemWeek === selectedWeek &&
            favorites.includes(getWordId(item))
        );
    });
}


/* ==============================
   현재 즐겨찾기 목록 다시 만들기
============================== */

function refreshCurrentFavorites() {
    if (currentMode === "all-favorites") {
        refreshAllFavorites();
        return;
    }

    if (currentMode === "week-favorites") {
        refreshWeekFavorites();
    }
}


/* ==============================
   즐겨찾기 없음 화면
============================== */

function showEmptyFavorites() {
    currentWords = [];
    currentIndex = 0;

    currentNumber.textContent = "0";
    totalNumber.textContent = "0";

    kanji.textContent = "즐겨찾기 없음";
    kanji.classList.add(
        "empty-favorite-title"
    );

    hiragana.textContent = "";

    if (currentMode === "week-favorites") {
        meaning.textContent =
            `${selectedWeek}에 즐겨찾기한 단어가 없습니다.`;
    } else {
        meaning.textContent =
            "단어 카드 오른쪽 위의 별을 눌러 추가하세요.";
    }

    meaning.classList.add(
        "empty-favorite-message"
    );

    answerArea.classList.remove(
        "hidden-answer"
    );

    favoriteButton.classList.add("hidden");

    disableStudyControls();

    answerVisible = true;
}


/* ==============================
   현재 단어 표시
============================== */

function showCurrentWord() {
    if (currentWords.length === 0) {
        return;
    }

    enableStudyControls();

    kanji.classList.remove(
        "empty-favorite-title"
    );

    meaning.classList.remove(
        "empty-favorite-message"
    );

    const item = currentWords[currentIndex];

    kanji.textContent =
        String(item.kanji || "").trim();

    hiragana.textContent =
        String(item.hiragana || "").trim();

    meaning.textContent =
        String(item.meaning || "").trim();

    currentNumber.textContent =
        String(currentIndex + 1);

    totalNumber.textContent =
        String(currentWords.length);

    updateFavoriteButton();
    hideAnswer();
}


/* ==============================
   정답 표시
============================== */

function showAnswer() {
    if (currentWords.length === 0) {
        return;
    }

    answerVisible = true;

    answerArea.classList.remove(
        "hidden-answer"
    );
}


function hideAnswer() {
    answerVisible = false;

    answerArea.classList.add(
        "hidden-answer"
    );
}


function toggleAnswer() {
    if (currentWords.length === 0) {
        return;
    }

    if (answerVisible) {
        hideAnswer();
    } else {
        showAnswer();
    }
}


/* ==============================
   이전·다음
============================== */

function moveNext() {
    if (currentWords.length === 0) {
        return;
    }

    currentIndex += 1;

    if (currentIndex >= currentWords.length) {
        currentIndex = 0;
    }

    showCurrentWord();
}


function movePrevious() {
    if (currentWords.length === 0) {
        return;
    }

    currentIndex -= 1;

    if (currentIndex < 0) {
        currentIndex =
            currentWords.length - 1;
    }

    showCurrentWord();
}


/* ==============================
   단어 순서 섞기
============================== */

function shuffleWords() {
    if (currentWords.length === 0) {
        return;
    }

    for (
        let index = currentWords.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        const temporary = currentWords[index];

        currentWords[index] =
            currentWords[randomIndex];

        currentWords[randomIndex] =
            temporary;
    }

    currentIndex = 0;
    showCurrentWord();
}

/* ==============================
   네이버사전
============================== */
function openNaverDictionary() {
    if (currentWords.length === 0) {
        return;
    }

    const item = currentWords[currentIndex];

    const searchWord =
        String(item.kanji || "").trim();

    if (!searchWord) {
        return;
    }

    const searchUrl =
        "https://ja.dict.naver.com/#/search?query=" +
        encodeURIComponent(searchWord);

    window.open(
        searchUrl,
        "_blank",
        "noopener,noreferrer"
    );
}

/* ==============================
   화면 전환
============================== */

function showStudyScreen() {
    weekScreen.classList.add("hidden");
    studyScreen.classList.remove("hidden");
}


function returnToWeekList() {

    stopAutoLearning();
    studyScreen.classList.add("hidden");
    weekScreen.classList.remove("hidden");

    currentMode = "week";
    currentWords = [];
    currentIndex = 0;
    answerVisible = false;

    /*
        selectedWeek은 초기화하지 않는다.
        즐겨찾기 화면에서 주차 목록으로 돌아간 뒤
        다시 주차를 선택하면 새 값으로 바뀐다.
    */
}


function disableStudyControls() {
    previousButton.disabled = true;
    nextButton.disabled = true;
    shuffleButton.disabled = true;
    cardContent.disabled = true;
    naverDictionaryButton.disabled = true;
}


function enableStudyControls() {
    previousButton.disabled = false;
    nextButton.disabled = false;
    shuffleButton.disabled = false;
    cardContent.disabled = false;
    naverDictionaryButton.disabled = false;
}

/* ==============================
   자동학습
============================== */

function updateAutoLearningButtons() {

    if (autoLearning) {

        autoMinusButton.disabled = false;
        autoPlusButton.disabled = false;

        autoLearningButton.textContent =
            `자동학습 ON · ${autoLearningSeconds}초`;

        autoLearningButton.classList.add(
            "active"
        );

    } else {

        autoMinusButton.disabled = true;
        autoPlusButton.disabled = true;

        autoLearningButton.textContent =
            `자동학습 ${autoLearningSeconds}초`;

        autoLearningButton.classList.remove(
            "active"
        );
    }
}


function startAutoLearning() {

    if (currentWords.length === 0) {
        return;
    }

    autoLearning = true;
    autoLearningPhase = "question";

    /*
        자동학습 시작 시 현재 단어는
        문제 상태로 다시 보여준다.
    */
    hideAnswer();

    updateAutoLearningButtons();

    scheduleAutoLearning();
}


function stopAutoLearning() {

    autoLearning = false;
    autoLearningPhase = "question";

    if (autoLearningTimer) {

        clearTimeout(autoLearningTimer);

        autoLearningTimer = null;
    }

    updateAutoLearningButtons();
}


function toggleAutoLearning() {

    if (autoLearning) {

        stopAutoLearning();

    } else {

        startAutoLearning();
    }
}


function scheduleAutoLearning() {

    if (!autoLearning) {
        return;
    }

    /*
        기존 타이머가 있으면 제거
    */
    if (autoLearningTimer) {

        clearTimeout(autoLearningTimer);
    }

    autoLearningTimer = setTimeout(
        runAutoLearningStep,
        autoLearningSeconds * 1000
    );
}


function runAutoLearningStep() {

    if (!autoLearning) {
        return;
    }

    if (currentWords.length === 0) {

        stopAutoLearning();

        return;
    }


    /*
        문제 단계
        ↓
        정답 표시
    */
    if (autoLearningPhase === "question") {

        showAnswer();

        autoLearningPhase = "answer";

        scheduleAutoLearning();

        return;
    }


    /*
        정답 단계
        ↓
        다음 단어
    */
    if (autoLearningPhase === "answer") {

        currentIndex += 1;

        /*
            마지막 단어까지 갔으면
            다시 첫 번째 단어부터
        */
        if (
            currentIndex >= currentWords.length
        ) {

            currentIndex = 0;
        }

        showCurrentWord();

        /*
            showCurrentWord에서
            자동으로 정답이 가려짐
        */

        autoLearningPhase = "question";

        scheduleAutoLearning();
    }
}


/* ==============================
   자동학습 시간 감소
============================== */

function decreaseAutoLearningTime() {

    if (!autoLearning) {
        return;
    }

    if (
        autoLearningSeconds <=
        MIN_AUTO_SECONDS
    ) {

        alert("최소값 1 입니다.");

        return;
    }

    autoLearningSeconds -= 1;

    updateAutoLearningButtons();

    /*
        변경된 시간을 현재 단계부터
        바로 적용
    */
    scheduleAutoLearning();
}


/* ==============================
   자동학습 시간 증가
============================== */

function increaseAutoLearningTime() {

    if (!autoLearning) {
        return;
    }

    if (
        autoLearningSeconds >=
        MAX_AUTO_SECONDS
    ) {

        alert("최대값 10 입니다.");

        return;
    }

    autoLearningSeconds += 1;

    updateAutoLearningButtons();

    /*
        변경된 시간을 현재 단계부터
        바로 적용
    */
    scheduleAutoLearning();
}


/* ==============================
   버튼 이벤트
============================== */

/* 카드 본문 클릭: 정답 표시 */
cardContent.addEventListener(
    "click",
    toggleAnswer
);


/* 별 버튼: 즐겨찾기 추가·해제 */
favoriteButton.addEventListener(
    "click",
    toggleFavorite
);


/*
    특정 주차 안의 즐겨찾기 버튼:
    현재 선택한 주차의 즐겨찾기만 조회
*/
favoriteListButton.addEventListener(
    "click",
    openWeekFavorites
);


/*
    메인 화면의 즐겨찾기 버튼:
    모든 주차의 즐겨찾기 조회
*/
mainFavoriteButton.addEventListener(
    "click",
    openAllFavorites
);


previousButton.addEventListener(
    "click",
    movePrevious
);


nextButton.addEventListener(
    "click",
    moveNext
);


shuffleButton.addEventListener(
    "click",
    shuffleWords
);


backButton.addEventListener(
    "click",
    returnToWeekList
);

naverDictionaryButton.addEventListener(
    "click",
    openNaverDictionary
);
autoLearningButton.addEventListener(
    "click",
    toggleAutoLearning
);


autoMinusButton.addEventListener(
    "click",
    decreaseAutoLearningTime
);


autoPlusButton.addEventListener(
    "click",
    increaseAutoLearningTime
);
/* ==============================
   프로그램 시작
============================== */

updateAutoLearningButtons();
loadWords();
