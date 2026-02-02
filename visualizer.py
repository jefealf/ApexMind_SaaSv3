import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
import glob

def get_latest_csv():
    """Encontra o arquivo CSV mais recente na pasta laps_data."""
    list_of_files = glob.glob('laps_data/*.csv')
    if not list_of_files:
        return None
    return max(list_of_files, key=os.path.getctime)

def plot_telemetry(csv_file):
    print(f"📊 Processando arquivo: {csv_file}...")
    
    # Carrega os dados
    df = pd.read_csv(csv_file)
    
    # Cria uma figura com 2 andares (Speed em cima, Pedais em baixo)
    fig = make_subplots(
        rows=2, cols=1, 
        shared_xaxes=True, # Ao dar zoom em um, o outro acompanha
        vertical_spacing=0.05,
        row_heights=[0.7, 0.3], # Gráfico de velocidade ocupa 70% da tela
        subplot_titles=("Speed Trace (km/h)", "Inputs (Throttle & Brake)")
    )

    # 1. Traço de Velocidade (A linha mais importante)
    fig.add_trace(go.Scatter(
        x=df['lap_dist_pct'], 
        y=df['speed'],
        mode='lines',
        name='Velocidade',
        line=dict(color='cyan', width=2)
    ), row=1, col=1)

    # 2. Acelerador (Verde)
    fig.add_trace(go.Scatter(
        x=df['lap_dist_pct'], 
        y=df['throttle'],
        mode='lines',
        name='Acelerador',
        line=dict(color='#00ff00', width=1),
        fill='tozeroy' # Preenche a área abaixo da linha
    ), row=2, col=1)

    # 3. Freio (Vermelho)
    fig.add_trace(go.Scatter(
        x=df['lap_dist_pct'], 
        y=df['brake'],
        mode='lines',
        name='Freio',
        line=dict(color='#ff0000', width=1),
        fill='tozeroy'
    ), row=2, col=1)

    # Estilização "Dark Mode" estilo Delta/F1
    fig.update_layout(
        template="plotly_dark",
        title_text=f"Telemetria ApexMind - {csv_file}",
        height=800,
        hovermode="x unified" # Mostra todos os valores ao passar o mouse
    )

    # Ajustes dos eixos
    fig.update_xaxes(title_text="Distância da Volta (%)", row=2, col=1)
    fig.update_yaxes(title_text="km/h", row=1, col=1)
    fig.update_yaxes(title_text="Input (0-1)", range=[0, 1.1], row=2, col=1)

    fig.show()

if __name__ == "__main__":
    latest_file = get_latest_csv()
    if latest_file:
        plot_telemetry(latest_file)
    else:
        print("❌ Nenhum arquivo CSV encontrado na pasta 'laps_data'. Rode o collector.py primeiro!")