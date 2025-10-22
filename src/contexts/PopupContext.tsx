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

type PopupState = (PopupConfig & { id: number }) | null;
type PopupSetter = (cfg: PopupConfig) => void;

const PopupContext = createContext<PopupSetter>(() => {});

export const PopupProvider = ({ children }: { children: ReactNode }) => {
  const [popup, setPopupState] = useState<PopupState>(null);

  const setPopup = useCallback((cfg: PopupConfig) => {
    setPopupState({ ...cfg, id: Date.now() });
  }, []);

  const hidePopup = useCallback((id: number) => {
    setPopupState((current) => {
      if (!current || current.id !== id) {
        return current;
      }
      return null;
    });
  }, []);

  return (
    <PopupContext.Provider value={setPopup}>
      {children}
      {popup && (
        <Popup
          key={popup.id}
          message={popup.message}
          color={popup.color}
          duration={popup.duration}
          onHide={() => hidePopup(popup.id)}
        />
      )}
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
