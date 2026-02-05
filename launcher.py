"""
SEO Log Analyzer Launcher
Starts backend and frontend, opens browser, and closes all when browser is closed.
"""
import subprocess
import sys
import os
import time
import webbrowser
import urllib.request
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
        print(f"  Arret du backend (PID: {backend_proc.pid})")
        kill_process_tree(backend_proc)

    # Kill frontend
    frontend_proc = find_process_by_port(FRONTEND_PORT)
    if frontend_proc:
        print(f"  Arret du frontend (PID: {frontend_proc.pid})")
        kill_process_tree(frontend_proc)

    print("Termine.")


def wait_for_server(url, timeout=30, label="server"):
    """Wait until a server responds with HTTP 200"""
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = urllib.request.urlopen(url, timeout=2)
            if response.status == 200:
                print(f"  {label} pret!")
                return True
        except Exception:
            pass
        time.sleep(0.5)
    print(f"  ATTENTION: {label} n'a pas demarre dans les {timeout}s")
    return False


def main():
    try:
        # Clean existing processes on our ports
        for port in [BACKEND_PORT, FRONTEND_PORT]:
            existing = find_process_by_port(port)
            if existing:
                print(f"Port {port} deja utilise. Fermeture...")
                kill_process_tree(existing)
                time.sleep(1)

        print("=" * 50)
        print("  SEO Log Analyzer")
        print("=" * 50)

        # Start backend
        print(f"\n[1/3] Demarrage du backend (port {BACKEND_PORT})...")
        backend_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(BACKEND_PORT)],
            cwd=BACKEND_DIR,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )

        # Wait for backend to be actually ready
        if not wait_for_server(f"http://localhost:{BACKEND_PORT}/health", timeout=20, label="Backend"):
            print("ERREUR: Backend n'a pas demarre. Verifiez les logs.")
            backend_process.terminate()
            return

        # Start frontend
        print(f"\n[2/3] Demarrage du frontend (port {FRONTEND_PORT})...")
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND_DIR,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )

        # Wait for frontend to be actually ready
        if not wait_for_server(f"http://localhost:{FRONTEND_PORT}", timeout=30, label="Frontend"):
            print("ERREUR: Frontend n'a pas demarre. Verifiez les logs.")
            cleanup()
            return

        # Open browser
        print(f"\n[3/3] Ouverture du navigateur...")
        webbrowser.open(FRONTEND_URL)

        print(f"\n{'=' * 50}")
        print(f"  SEO Log Analyzer est en cours d'execution!")
        print(f"  URL: {FRONTEND_URL}")
        print(f"  Appuyez sur Ctrl+C pour arreter...")
        print(f"{'=' * 50}\n")

        # Wait for processes
        while True:
            time.sleep(1)
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                break

    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    main()
