.PHONY: build validate test serve xlsx find report clean \
        web-install web-dev web-build web-lint web-test \
        docker-image docker-build docker-validate docker-test docker-xlsx docker-serve docker-shell docker-find docker-report

# ---- Host Python (used by CI; needs `pip install -r requirements.txt`) ----
build:    ; python build.py
validate: ; python build.py --check-only
test:     ; python -m unittest discover -s tests
xlsx:     ; python build.py --xlsx-only
find:     ; @python tools/find_saint.py "$(NAME)"   # search-before-add (CLAUDE.md §6): make find NAME="..."
report:   ; @python build.py --report $(if $(TOP),--top $(TOP),)   # rank icon-less saints for the next batch (issue #83); make report TOP=100
clean:    ; rm -rf public/* dist/* _site .astro && touch public/.gitkeep dist/.gitkeep

# ---- Node / Astro frontend (needs Node 24+; `make web-install` first) ----
# These call `npm` directly so they also work on Windows/PowerShell without make.
web-install: ; npm ci
web-dev:     ; python build.py --no-xlsx && npm run dev      # data.json, then Astro dev server
web-build:   ; python build.py --no-xlsx && npm run build    # data.json, then static _site/
web-lint:    ; npm run lint
web-test:    ; npm test                                       # Playwright smoke tests
serve: web-dev   # `make serve` now runs the Astro dev server (the live site)

# ---- Containerized build environment (no local Python/deps needed) ----
# --user keeps generated files and CSV write-backs owned by you, not root.
DC    = docker compose
DUSER = --user $(shell id -u):$(shell id -g)

docker-image:    ; $(DC) build
docker-build:    docker-image ; $(DC) run --rm $(DUSER) saints python build.py
docker-validate: docker-image ; $(DC) run --rm $(DUSER) saints python build.py --check-only
docker-test:     docker-image ; $(DC) run --rm $(DUSER) saints python -m unittest discover -s tests
docker-xlsx:     docker-image ; $(DC) run --rm $(DUSER) saints python build.py --xlsx-only
docker-find:     docker-image ; $(DC) run --rm $(DUSER) saints python tools/find_saint.py "$(NAME)"
docker-report:   docker-image ; $(DC) run --rm $(DUSER) saints python build.py --report $(if $(TOP),--top $(TOP),)
docker-shell:    docker-image ; $(DC) run --rm $(DUSER) saints bash
docker-serve:    docker-image ; $(DC) run --rm $(DUSER) --service-ports saints \
                     sh -c "python build.py && cd public && python -m http.server 8000"
