"use strict";


/* ==============================
   상태값
============================== */

let allWords = [];
let currentWords = [];
let currentIndex = 0;
let answerVisible = false;
let currentMode = "week";

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


/* ==============================
   데이터 불러오기
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
        const weekName = String(item.week).trim();

        if (!groupedWeeks[weekName]) {
            groupedWeeks[weekName] = [];
        }

        groupedWeeks[weekName].push(item);
    });

    const weekNames = Object.keys(groupedWeeks).reverse();

    weekNames.forEach((weekName) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "week-item";

        const title = document.createElement("span");
        title.className = "week-item-title";
        title.textContent = weekName;

        const count = document.createElement("span");
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


function openWeek(weekName) {
    currentMode = "week";

    currentWords = allWords.filter(
        (item) => String(item.week).trim() === weekName
    );

    currentIndex = 0;

    weekTitle.textContent = weekName;

    showStudyScreen();
    showCurrentWord();
}


/* ==============================
   즐겨찾기
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

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed;

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
        즐겨찾기 목록에서 별을 해제하면
        현재 즐겨찾기 목록을 새로 만든다.
    */
    if (currentMode === "favorites") {
        refreshFavoriteWords();

        if (currentWords.length === 0) {
            showEmptyFavorites();
            return;
        }

        if (currentIndex >= currentWords.length) {
            currentIndex = currentWords.length - 1;
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


function refreshFavoriteWords() {
    const favorites = getFavorites();

    currentWords = allWords.filter((item) => {
        return favorites.includes(getWordId(item));
    });
}


function openFavorites() {
    currentMode = "favorites";
    currentIndex = 0;

    refreshFavoriteWords();

    weekTitle.textContent = "즐겨찾기";

    showStudyScreen();

    if (currentWords.length === 0) {
        showEmptyFavorites();
        return;
    }

    enableStudyControls();
    showCurrentWord();
}


function showEmptyFavorites() {
    currentWords = [];
    currentIndex = 0;

    currentNumber.textContent = "0";
    totalNumber.textContent = "0";

    kanji.textContent = "즐겨찾기 없음";
    kanji.classList.add("empty-favorite-title");

    hiragana.textContent = "";

    meaning.textContent =
        "단어 카드 오른쪽 위의 별을 눌러 추가하세요.";

    meaning.classList.add("empty-favorite-message");

    answerArea.classList.remove("hidden-answer");

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

    kanji.classList.remove("empty-favorite-title");
    meaning.classList.remove("empty-favorite-message");

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
   이전 / 다음
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
        currentIndex = currentWords.length - 1;
    }

    showCurrentWord();
}


/* ==============================
   단어 섞기
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
   화면 전환
============================== */

function showStudyScreen() {
    weekScreen.classList.add("hidden");
    studyScreen.classList.remove("hidden");
}


function returnToWeekList() {
    studyScreen.classList.add("hidden");
    weekScreen.classList.remove("hidden");

    currentMode = "week";
    currentWords = [];
    currentIndex = 0;
    answerVisible = false;
}


function disableStudyControls() {
    previousButton.disabled = true;
    nextButton.disabled = true;
    shuffleButton.disabled = true;
    cardContent.disabled = true;
}


function enableStudyControls() {
    previousButton.disabled = false;
    nextButton.disabled = false;
    shuffleButton.disabled = false;
    cardContent.disabled = false;
}


/* ==============================
   버튼 이벤트
============================== */

/*
    정답은 카드 본문을 눌렀을 때만 표시된다.
    즐겨찾기 버튼 클릭과 절대로 겹치지 않는다.
*/
cardContent.addEventListener(
    "click",
    toggleAnswer
);


/*
    별 버튼은 별 버튼 기능만 수행한다.
*/
favoriteButton.addEventListener(
    "click",
    toggleFavorite
);


favoriteListButton.addEventListener(
    "click",
    openFavorites
);


mainFavoriteButton.addEventListener(
    "click",
    openFavorites
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


/* ==============================
   시작
============================== */

loadWords();
