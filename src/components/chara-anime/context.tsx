"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useGetCharactersByAnimeIdMAL } from "../queries/getCharactersByAnime";
import { CharacterData } from "@/types/characters";
import { usePageContext } from "../context";
import { SearchAnime } from "../game/context";
import { useGetAnimeRelated } from "../utils/useGetAnimeRelated";
import { getRandomByArray } from "../utils/functions";

type CharaAnimeStatus =
  | "loading"
  | "init"
  | "stale"
  | "playing"
  | "win"
  | "end"
  | "win-round"
  | "error-round"
  | "show-names";

export type CharaAnimeGameMode = "classic" | "hardcore" | "endless";

type RoundData = {
  animes: MinAnimeData[];
  characters: CharacterData[];
  points: number;
  selectedAnimes: MinAnimeData[];
};

type MinAnimeData = {
  id: number;
  idMal: number;
  name: string;
  englishName?: string | null;
};

export type CharaAnimeContext = {
  anime: SearchAnime | null;
  animes: MinAnimeData[];
  characters: CharacterData[];
  isLoading: boolean;
  status: CharaAnimeStatus;
  setStatus: (status: CharaAnimeStatus) => void;
  redo: () => void;
  totalRounds: number;
  setTotalRounds: (round: number) => void;
  currentRound: number;
  setCurrentRound: (round: number) => void;
  rounds: RoundData[];
  totalPoints: number;
  addPoints: (points: number) => void;
  animesAlreadyShowed: number[];
  addAnime: (anime: SearchAnime) => boolean;
  winGame: () => void;
  nextRound: () => void;
  currentPosition: number;
  setCurrentPosition: (position: number) => void;
  initGame: () => void;
  numCharacters: number;
  setNumCharacters: (position: number) => void;
  selectedAnimes: SearchAnime[];
  numCorrects: number;
  startGame: () => void;
  isLoadingCharacters: boolean;
  gameMode: CharaAnimeGameMode;
  setGameMode: (mode: CharaAnimeGameMode) => void;
  isNewRecordEndless: boolean;
  setIsNewRecordEndless: (isNewRecord: boolean) => void;
};

const CharaAnimeContext = createContext<CharaAnimeContext>({
  characters: [],
  animes: [],
  isLoading: true,
  status: "init",
  setStatus: () => {},
  redo: () => {},
  totalRounds: 0,
  setTotalRounds: () => {},
  currentRound: 0,
  setCurrentRound: () => {},
  rounds: [],
  totalPoints: 0,
  addPoints: () => {},
  animesAlreadyShowed: [],
  addAnime: () => false,
  winGame: () => {},
  nextRound: () => {},
  currentPosition: 0,
  setCurrentPosition: () => {},
  initGame: () => {},
  numCharacters: 0,
  setNumCharacters: () => {},
  selectedAnimes: [],
  numCorrects: 0,
  startGame: () => {},
  isLoadingCharacters: false,
  gameMode: "classic",
  setGameMode: () => {},
  anime: null,
  isNewRecordEndless: false,
  setIsNewRecordEndless: () => {},
});

export function CharaAnimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<CharaAnimeStatus>("init");
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [animesAlreadyShowed, setAnimesAlreadyShowed] = useState<number[]>([]);
  const [numCharacters, setNumCharacters] = useState(4);
  const [numCorrects, setNumCorrects] = useState(0);

  const [selectedAnimes, setSelectedAnimes] = useState<SearchAnime[]>([]);
  const [currentPosition, setCurrentPosition] = useState<number>(0);

  const [gameMode, setGameMode] = useState<CharaAnimeGameMode>("classic");

  const [isNewRecordEndless, setIsNewRecordEndless] = useState(false);

  const {
    animes: animesTotal,
    isLoading: isLoadingAnimes,
    allAnimes,
  } = usePageContext();

  const {
    characters,
    isLoading: isLoadingCharacters,
    redo,
    anime,
  } = useGetCharactersToCharaAnime(animesTotal);

  const animes = useGetAnimeRelated(allAnimes, anime?.id);

  const startGame = () => {
    setCurrentRound(1);
    setCurrentPosition(0);
    setSelectedAnimes([]);
    setStatus("stale");
    redo();
  };

  const initRound = () => {
    setCurrentPosition(0);
    setSelectedAnimes([]);
    setStatus("stale");
  };

  const initGame = () => {
    setIsNewRecordEndless(false);
    setRounds([]);
    setCurrentRound(0);
    setCurrentPosition(0);
    setSelectedAnimes([]);
    setTotalPoints(0);
    setStatus("init");
    setAnimesAlreadyShowed([]);
    setNumCorrects(0);
  };

  const addPoints = (points: number) => {
    setTotalPoints((prev) => prev + points);
  };

  const addAnime = (anime: SearchAnime) => {
    if (status === "show-names") return false;
    const newSelectedAnimes = [anime, ...selectedAnimes];
    setSelectedAnimes(newSelectedAnimes);
    if (
      animes.some(
        (a) =>
          a.id === anime.id ||
          a.idMal === anime.idMal ||
          (anime.englishName &&
            a.englishName &&
            a.englishName === anime.englishName) ||
          a.name === anime.name
      )
    ) {
      setNumCorrects((prev) => prev + 1);
      const points = 40 - 10 * (currentPosition - 1);
      addPoints(points);
      setRounds((prev) => [
        ...prev,
        {
          animes,
          characters,
          points,
          selectedAnimes: newSelectedAnimes,
        },
      ]);

      setStatus("win-round");
      return true;
    } else if (gameMode === "hardcore") {
      if (currentPosition === 4) {
        setStatus("show-names");
        return false;
      }
      setCurrentPosition((prev) => prev + 1);
    } else if (gameMode === "endless") {
      setRounds((prev) => [
        ...prev,
        {
          animes,
          characters,
          points: 0,
          selectedAnimes: newSelectedAnimes,
        },
      ]);
    }
    setStatus("error-round");
    return false;
  };

  const winGame = () => {
    setStatus("win");
  };

  const nextRound = () => {
    if (!anime) return;
    const alreadyShowed = [...animesAlreadyShowed, anime.id];
    setAnimesAlreadyShowed(alreadyShowed);
    if (selectedAnimes.length === 0 && currentRound > 0) {
      setRounds((prev) => [
        ...prev,
        {
          animes,
          characters,
          points: 0,
          selectedAnimes: [],
        },
      ]);
    }
    if (
      gameMode === "endless" &&
      (status === "error-round" ||
        status === "show-names" ||
        status !== "win-round")
    ) {
      setStatus("end");
      return;
    }
    if (gameMode !== "endless") {
      if (totalRounds !== 0 && currentRound === totalRounds) {
        setStatus("end");
        return;
      }
    }
    setCurrentRound((prev) => prev + 1);
    initRound();

    redo(alreadyShowed);
  };

  const reload = useCallback(() => {
    initRound();
    redo(animesAlreadyShowed);
  }, [animesAlreadyShowed, redo]);

  useEffect(() => {
    if (totalRounds > animesTotal.length || gameMode === "endless")
      setTotalRounds(animesTotal.length);
  }, [totalRounds, animesTotal, gameMode]);

  return (
    <CharaAnimeContext.Provider
      value={{
        characters: characters ?? [],
        animes,
        isLoading: isLoadingAnimes,
        status,
        setStatus,
        redo: reload,
        totalRounds,
        setTotalRounds,
        currentRound,
        setCurrentRound,
        rounds,
        totalPoints,
        addPoints,
        animesAlreadyShowed,
        addAnime,
        winGame,
        nextRound,
        currentPosition,
        setCurrentPosition,
        initGame,
        numCharacters,
        setNumCharacters,
        selectedAnimes,
        numCorrects,
        startGame,
        isLoadingCharacters,
        gameMode,
        setGameMode,
        anime,
        isNewRecordEndless,
        setIsNewRecordEndless,
      }}
    >
      {children}
    </CharaAnimeContext.Provider>
  );
}

export function useGetCharactersToCharaAnime(
  animes: SearchAnime[] | null = []
) {
  const [anime, setAnime] = useState<SearchAnime | null>(null);

  const { mutateAsync, isPending } = useGetCharactersByAnimeIdMAL();

  const [charactersToReturn, setCharactersToReturn] = useState<CharacterData[]>(
    []
  );

  const redo = useCallback(
    async (alreadyShowed: number[] = []) => {
      if (!animes) return;
      const anime = getRandomByArray(
        animes.filter((anime) => !alreadyShowed.includes(anime.id))
      );
      setAnime(anime);
      if (!anime) return;
      const characters = await mutateAsync(anime.idMal);
      const charactersToReturn = getRandomCharacters(characters ?? [], 4);
      if (charactersToReturn.length < 4) {
        console.log({ anime, characters, charactersToReturn });
        await redo(alreadyShowed);
        return;
      }
      setCharactersToReturn(charactersToReturn);
    },
    [animes, mutateAsync]
  );

  return {
    characters: charactersToReturn,
    redo,
    anime,
    isLoading: isPending,
  };
}

function getRandomCharacters(charactersData: CharacterData[], X: number) {
  if (charactersData.length < X) return [];
  const characters = charactersData.filter((char) => {
    return (
      !char.character.images.jpg.image_url.includes("questionmark") &&
      !char.character.images.webp.image_url.includes("questionmark")
    );
  });
  const supportingCharacters = characters.filter(
    (char) => char.role === "Supporting"
  );
  const mainCharacters = characters.filter((char) => char.role === "Main");

  if (supportingCharacters.length < X - 1) {
    if (mainCharacters.length < X - supportingCharacters.length) return [];
    const characterToReturn: CharacterData[] = supportingCharacters;
    let tries = 0;
    while (characterToReturn.length < X && tries < 10) {
      const characterData = getRandomByArray(mainCharacters);
      if (!characterData) continue;
      if (
        !characterToReturn.some(
          (char) => char.character.mal_id === characterData.character.mal_id
        )
      ) {
        characterToReturn.push(characterData);
      }
      tries++;
    }
    characterToReturn.sort((a, b) => a.favorites - b.favorites);
    if (characterToReturn.length < X) return [];
    return characterToReturn;
  }

  // Ordenar los Supporting Characters por favoritos
  supportingCharacters.sort((a, b) => a.favorites - b.favorites);

  // Obtener el valor mínimo y máximo de favoritos de los Supporting Characters
  const minFavourites = supportingCharacters[0].favorites;
  const maxFavourites =
    supportingCharacters[supportingCharacters.length - 1].favorites;

  // Calcular el rango de cada chunk
  const chunkSize = (maxFavourites - minFavourites) / (X - 1);

  // Crear los chunks de personajes de Supporting Characters
  const selectedSupportingCharacters: CharacterData[] = [];
  let remainingChunks = X - 1;

  for (let i = 0; i < X - 1; i++) {
    const chunkMin = minFavourites + i * chunkSize;
    const chunkMax = chunkMin + chunkSize;

    // Filtrar los personajes en el rango del chunk actual
    const charactersInChunk = supportingCharacters.filter(
      (char) => char.favorites >= chunkMin && char.favorites < chunkMax
    );

    // Seleccionar un personaje aleatorio del chunk, si está vacío, se pasa al siguiente
    if (charactersInChunk.length > 0) {
      selectedSupportingCharacters.push(
        charactersInChunk[Math.floor(Math.random() * charactersInChunk.length)]
      );
      remainingChunks--;
    }

    // Si ya se seleccionaron suficientes Supporting Characters, se detiene
    if (remainingChunks <= 0) break;
  }

  // Si no se alcanzaron suficientes Supporting Characters, completar con el resto
  let remainingCharacters = supportingCharacters.filter(
    (char) => !selectedSupportingCharacters.includes(char)
  );
  while (remainingChunks > 0 && remainingCharacters.length > 0) {
    selectedSupportingCharacters.push(
      remainingCharacters[
        Math.floor(Math.random() * remainingCharacters.length)
      ]
    );
    remainingCharacters = remainingCharacters.filter(
      (char) => !selectedSupportingCharacters.includes(char)
    );
    remainingChunks--;
  }

  // Seleccionar un Main Character aleatorio
  const mainCharacter =
    mainCharacters[Math.floor(Math.random() * mainCharacters.length)];

  // Devolver los Supporting Characters seleccionados más el Main Character
  // sort de menor a mayor
  return [
    ...selectedSupportingCharacters.sort((a, b) => a.favorites - b.favorites),
    mainCharacter,
  ];
}

export function useCharaAnimeContext() {
  return useContext(CharaAnimeContext);
}
