import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import Popup, { PopupColor } from "@/src/components/popup/popup";

interface PopupConfig {
  message: string;
  color: PopupColor;
  duration: number;
}

type PopupState = PopupConfig | null;
type PopupSetter = (cfg: PopupConfig) => void;

const PopupContext = createContext<PopupSetter>(() => {});

export const PopupProvider = ({ children }: { children: ReactNode }) => {
  const [popup, setPopupState] = useState<PopupState>(null);

  const setPopup = useCallback((cfg: PopupConfig) => {
    setPopupState(cfg);
    setTimeout(() => setPopupState(null), cfg.duration);
  }, []);

  return (
    <PopupContext.Provider value={setPopup}>
      {children}
      {popup && <Popup message={popup.message} color={popup.color} />}
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
