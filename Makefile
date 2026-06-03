.PHONY: build validate test serve xlsx clean \
        docker-image docker-build docker-validate docker-test docker-xlsx docker-serve docker-shell

# ---- Host Python (used by CI; needs `pip install -r requirements.txt`) ----
build:    ; python build.py
validate: ; python build.py --check-only
test:     ; python -m unittest discover -s tests
serve:    ; python build.py && cd public && python -m http.server 8000
xlsx:     ; python build.py --xlsx-only
clean:    ; rm -rf public/* dist/* && touch public/.gitkeep dist/.gitkeep

# ---- Containerized build environment (no local Python/deps needed) ----
# --user keeps generated files and CSV write-backs owned by you, not root.
DC    = docker compose
DUSER = --user $(shell id -u):$(shell id -g)

docker-image:    ; $(DC) build
docker-build:    docker-image ; $(DC) run --rm $(DUSER) saints python build.py
docker-validate: docker-image ; $(DC) run --rm $(DUSER) saints python build.py --check-only
docker-test:     docker-image ; $(DC) run --rm $(DUSER) saints python -m unittest discover -s tests
docker-xlsx:     docker-image ; $(DC) run --rm $(DUSER) saints python build.py --xlsx-only
docker-shell:    docker-image ; $(DC) run --rm $(DUSER) saints bash
docker-serve:    docker-image ; $(DC) run --rm $(DUSER) --service-ports saints \
                     sh -c "python build.py && cd public && python -m http.server 8000"
