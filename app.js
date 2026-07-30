"use strict";

let allWords = [];
let currentWords = [];
let currentIndex = 0;
let answerVisible = false;
let currentMode = "week";

const FAVORITES_KEY = "japanese-wordbook-favorites";

const weekScreen = document.getElementById("week-screen");
const studyScreen = document.getElementById("study-screen");
const weekList = document.getElementById("week-list");

const weekTitle = document.getElementById("week-title");
const currentNumber = document.getElementById("current-number");
const totalNumber = document.getElementById("total-number");

const wordCard = document.getElementById("word-card");
const kanji = document.getElementById("kanji");
const hiragana = document.getElementById("hiragana");
const meaning = document.getElementById("meaning");
const answerArea = document.getElementById("answer-area");

const backButton = document.getElementById("back-button");
const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const shuffleButton = document.getElementById("shuffle-button");

const favoriteButton =
    document.getElementById("favorite-button");

const favoriteListButton =
    document.getElementById("favorite-list-button");


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

        allWords = await response.json();

        if (!Array.isArray(allWords) || allWords.length === 0) {
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


function renderWeekList() {
    weekList.innerHTML = "";

    const groupedWeeks = {};

    allWords.forEach((item) => {
        if (!groupedWeeks[item.week]) {
            groupedWeeks[item.week] = [];
        }

        groupedWeeks[item.week].push(item);
    });

    const weekNames = Object.keys(groupedWeeks).reverse();

    weekNames.forEach((weekName) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "week-item";

        button.innerHTML = `
            <span class="week-item-title">
                ${escapeHtml(weekName)}
            </span>

            <span class="week-item-count">
                단어 ${groupedWeeks[weekName].length}개
            </span>
        `;

        button.addEventListener("click", () => {
            openWeek(weekName);
        });

        weekList.appendChild(button);
    });
}


function openWeek(weekName) {
    currentMode = "week";

    currentWords = allWords.filter(
        (item) => item.week === weekName
    );

    currentIndex = 0;
    weekTitle.textContent = weekName;

    weekScreen.classList.add("hidden");
    studyScreen.classList.remove("hidden");

    showCurrentWord();
}


function openFavorites() {
    const favoriteIds = getFavorites();

    currentWords = allWords.filter((item) => {
        return favoriteIds.includes(getWordId(item));
    });

    currentMode = "favorites";
    currentIndex = 0;

    weekScreen.classList.add("hidden");
    studyScreen.classList.remove("hidden");

    weekTitle.textContent = "즐겨찾기 단어";

    if (currentWords.length === 0) {
        showEmptyFavorites();
        return;
    }

    wordCard.classList.remove("hidden");
    previousButton.disabled = false;
    nextButton.disabled = false;
    shuffleButton.disabled = false;

    showCurrentWord();
}


function showEmptyFavorites() {
    currentNumber.textContent = "0";
    totalNumber.textContent = "0";

    wordCard.classList.remove("hidden");

    kanji.textContent = "즐겨찾기 없음";
    hiragana.textContent = "";
    meaning.textContent =
        "단어 오른쪽 위의 별표를 눌러 추가하세요.";

    answerArea.classList.remove("hidden-answer");

    favoriteButton.classList.add("hidden");

    previousButton.disabled = true;
    nextButton.disabled = true;
    shuffleButton.disabled = true;
}


function showCurrentWord() {
    if (currentWords.length === 0) {
        return;
    }

    favoriteButton.classList.remove("hidden");

    previousButton.disabled = false;
    nextButton.disabled = false;
    shuffleButton.disabled = false;

    const item = currentWords[currentIndex];

    kanji.textContent = item.kanji || "";
    hiragana.textContent = item.hiragana || "";
    meaning.textContent = item.meaning || "";

    currentNumber.textContent = currentIndex + 1;
    totalNumber.textContent = currentWords.length;

    updateFavoriteButton();
    hideAnswer();
}


function getWordId(item) {
    return [
        item.week || "",
        item.kanji || "",
        item.hiragana || "",
        item.meaning || ""
    ].join("|");
}


function getFavorites() {
    try {
        const saved = localStorage.getItem(FAVORITES_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
        console.error("즐겨찾기 조회 오류:", error);
        return [];
    }
}


function saveFavorites(favorites) {
    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
    );
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

    if (currentMode === "favorites") {
        currentWords = allWords.filter((word) => {
            return favorites.includes(getWordId(word));
        });

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
        return;
    }

    const item = currentWords[currentIndex];
    const favorite = isFavorite(item);

    favoriteButton.textContent = favorite ? "★" : "☆";

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
}


function showAnswer() {
    answerVisible = true;
    answerArea.classList.remove("hidden-answer");
}


function hideAnswer() {
    answerVisible = false;
    answerArea.classList.add("hidden-answer");
}


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


function shuffleWords() {
    if (currentWords.length === 0) {
        return;
    }

    for (
        let index = currentWords.length - 1;
        index > 0;
        index--
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [
            currentWords[index],
            currentWords[randomIndex]
        ] = [
            currentWords[randomIndex],
            currentWords[index]
        ];
    }

    currentIndex = 0;
    showCurrentWord();
}


function returnToWeekList() {
    studyScreen.classList.add("hidden");
    weekScreen.classList.remove("hidden");

    currentMode = "week";
    currentWords = [];
    currentIndex = 0;
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


wordCard.addEventListener("click", () => {
    if (currentWords.length === 0) {
        return;
    }

    if (answerVisible) {
        hideAnswer();
    } else {
        showAnswer();
    }
});


favoriteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite();
});


favoriteListButton.addEventListener("click", () => {
    openFavorites();
});


previousButton.addEventListener("click", movePrevious);
nextButton.addEventListener("click", moveNext);
shuffleButton.addEventListener("click", shuffleWords);
backButton.addEventListener("click", returnToWeekList);

loadWords();
