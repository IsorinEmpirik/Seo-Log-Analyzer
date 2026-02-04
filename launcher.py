"""
SEO Log Analyzer Launcher
Starts backend and frontend, opens browser, and closes all when browser is closed.
"""
import subprocess
import sys
import os
import time
import webbrowser
import signal
import psutil

# Configuration
BACKEND_PORT = 8000
FRONTEND_PORT = 5173
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

# Get the script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


def find_process_by_port(port):
    """Find process using a specific port"""
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections():
                if conn.laddr.port == port:
                    return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None


def kill_process_tree(proc):
    """Kill a process and all its children"""
    try:
        parent = psutil.Process(proc.pid)
        children = parent.children(recursive=True)
        for child in children:
            child.terminate()
        parent.terminate()
        gone, alive = psutil.wait_procs(children + [parent], timeout=5)
        for p in alive:
            p.kill()
    except psutil.NoSuchProcess:
        pass


def cleanup():
    """Clean up all processes"""
    print("\nFermeture de SEO Log Analyzer...")

    # Kill backend
    backend_proc = find_process_by_port(BACKEND_PORT)
    if backend_proc:
        print(f"Arrêt du backend (PID: {backend_proc.pid})")
        kill_process_tree(backend_proc)

    # Kill frontend
    frontend_proc = find_process_by_port(FRONTEND_PORT)
    if frontend_proc:
        print(f"Arrêt du frontend (PID: {frontend_proc.pid})")
        kill_process_tree(frontend_proc)

    print("Terminé.")


def main():
    processes = []

    try:
        # Check if ports are available
        if find_process_by_port(BACKEND_PORT):
            print(f"Port {BACKEND_PORT} déjà utilisé. Fermeture...")
            cleanup()
            time.sleep(1)

        if find_process_by_port(FRONTEND_PORT):
            print(f"Port {FRONTEND_PORT} déjà utilisé. Fermeture...")
            cleanup()
            time.sleep(1)

        print("Démarrage de SEO Log Analyzer...")

        # Start backend
        print(f"Démarrage du backend sur le port {BACKEND_PORT}...")
        backend_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(BACKEND_PORT)],
            cwd=BACKEND_DIR,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        processes.append(backend_process)

        # Wait for backend to start
        time.sleep(2)

        # Start frontend
        print(f"Démarrage du frontend sur le port {FRONTEND_PORT}...")
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND_DIR,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        processes.append(frontend_process)

        # Wait for frontend to start
        time.sleep(3)

        # Open browser
        print(f"Ouverture du navigateur: {FRONTEND_URL}")
        webbrowser.open(FRONTEND_URL)

        print("\n" + "="*50)
        print("SEO Log Analyzer est en cours d'exécution!")
        print(f"URL: {FRONTEND_URL}")
        print("Appuyez sur Ctrl+C pour arrêter...")
        print("="*50 + "\n")

        # Wait for processes
        while True:
            time.sleep(1)
            # Check if processes are still running
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                break

    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    main()
