import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

export function StoryControls({ tocando, aoTocar, aoReiniciar, aoAvancar, aoVoltar, desabilitado }) {
  return <div className="story-controls" aria-label="Controles do modo evolução"><div><span className="selo-story">MODO EVOLUÇÃO</span><strong>Revelar a trajetória período a período</strong></div><div className="story-controls__botoes"><button onClick={aoVoltar} disabled={desabilitado} aria-label="Período anterior"><ChevronLeft /></button><button className="story-controls__principal" onClick={aoTocar} disabled={desabilitado} aria-label={tocando ? 'Pausar evolução' : 'Reproduzir evolução'}>{tocando ? <Pause /> : <Play />}</button><button onClick={aoAvancar} disabled={desabilitado} aria-label="Próximo período"><ChevronRight /></button><button onClick={aoReiniciar} disabled={desabilitado} aria-label="Reiniciar evolução"><RotateCcw /></button></div></div>;
}
