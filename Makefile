

up: 
	@docker compose up 

up -d:
	@docker compose up -d

down:
	@docker compose down

clean:
	@docker compose down -v

ps:
	@docker compose ps

logs:
	@docker compose logs -f