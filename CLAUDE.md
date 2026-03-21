# General Instructions

我現在準備要開始開發 grafana-cli 專案，這是一個 node.js 程式可以透過 terminal 去存取 Grafana。基本的功能如下：

1. 設定 grafana 伺服器的 URL 和認證資訊(選填)
2. 支援多組伺服器和認證設定
3. 執行 grafana rest api 支援的查詢，這部分還未知所以需要再深入探索
4. 顯示查詢結果
5. 檢查 grafana 伺服器的狀態

需要支援 Grafana v7.5，該版本的 http api 文件如下：
https://grafana.com/docs/grafana/v7.5/http_api/

相關介面的實作可以參考 $HOME/Code/prom-cli

請你如果有作任何

- 思考邏輯
- 操作
- 結果推論

請寫到專案根目錄的 @MEMORY.md，以供未來自己或其他 AI agent 進行回想，內容請用

- 條列式，並加 [P0/P1/P2] 優先級標籤
  - [P0] 核心身份（永不過期）
  - [P1] 活躍專案（90 天過期）
  - [P2] 臨時內容（30 天過期）
- 盡量簡短，總行數不超過 200 行
- 用詞請盡量中性，不要用太過於強烈的詞彙
- 過期內容移到 archive/，之後可以用語意搜尋召回
- 建立原始日誌：raw/YYYY-MM-DD.md 保持不動，不主動載入
- 建立 memory-janitor.py，cron 每天自動將原始日誌歸檔

如果有什麼想不起來的地方，也可以回去查 @MEMORY.md

## 開發原則

請你開發的模式遵照

## S.O.L.I.D 原則

SOLID 原則則是一組設計原則，有助於實現Clean Architecture。以下是 SOLID 原則的簡要說明，以便更好地理解其在 Clean Architecture 中的應用：

- 單一職責原則 (Single Responsibility Principle — SRP)：每個類別或模組應該僅有一個改變的理由，也就是說，它應該只有一個職責。在 Clean Architecture 中，這意味著每一層（例如，實體、用例、介面等）都應該只負責一個特定的關注點。

- 開放/封閉原則 (Open/Closed Principle — OCP)：系統的設計應該是開放擴展的，但封閉修改的。這表示，當需要新增功能時，應該透過擴展現有的代碼而非修改現有的代碼。在 Clean Architecture 中，這鼓勵我們透過新增新的用例、實體等，而不是修改現有的業務邏輯。

- 里氏替換原則 (Liskov Substitution Principle — LSP)：衍生類別應該能夠替換基類別而不影響程式的正確性。在 Clean Architecture 中，這表示你可以更換不同的實現方式，而不影響用例或其他高層次的模組。

- 介面隔離原則 (Interface Segregation Principle — ISP)：不應該強迫一個類別實現它用不到的介面。換句話說，一個類別不應該被迫依賴它不使用的方法。在 Clean Architecture 中，這表示介面應該被設計得小而專注，每個用例或模組僅需實現它們需要的部分。

- 依賴反轉原則 (Dependency Inversion Principle — DIP)：高層次的模組不應該依賴於低層次的模組，兩者都應該依賴於抽象。在 Clean Architecture 中，這表示高層次的用例或實體不應該直接依賴低層次的實現，而應該透過介面或抽象來實現。

## 可用工具

### GitHub Pull Request Review 回覆

當需要回覆 PR review comments 時：

```bash
# 回覆 PR review comment (在 conversation thread 中回覆)
gh api -X POST repos/:owner/:repo/pulls/:pr_number/comments \
  -f body="回覆內容" \
  -F in_reply_to=:comment_id

# 範例
gh api -X POST repos/jack482653/grafana-cli/pulls/3/comments \
  -f body="已修正，commit 63842eb" \
  -F in_reply_to=2660628000
```

**注意：**

- `body` 必須用 `-f` 方式傳遞， `in_reply_to` 必須用 `-F` 方式傳遞
- `in_reply_to` 是 comment ID (從 review comments API 取得)
- 這會在 conversation thread 中新增回覆，而非獨立的 comment
- 如果是回覆 gemini-code-assist 的 review comment，請在回覆內容的最開頭加上 @gemini-code-assist (不要用反引號) 以通知對方

### 解決 (Resolve) Review Thread

```bash
# 使用 GraphQL API 解決 review thread
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_xxxxx"}) {
    thread { id isResolved }
  }
}'

# 批次解決多個 threads
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "PRRT_xxx1"}) { thread { id } } }' && \
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "PRRT_xxx2"}) { thread { id } } }'
```

**注意：**

- `threadId` 格式為 `PRRT_xxxxx` (從 review comments API 的 `ID` 欄位取得)
- 解決後該 thread 會被標記為 resolved 並收合

### 取得 PR Review Comments

```bash
# 使用 MCP GitHub tool
mcp__github__pull_request_read(
  method: "get_review_comments",
  owner: "jack482653",
  repo: "grafana-cli",
  pullNumber: 3
)
```

回傳的 `reviewThreads` 包含：

- `ID`: Thread ID (用於 resolve)
- `Comments.Nodes[].ID`: Comment ID (用於 in_reply_to)
- `IsResolved`: 是否已解決

## Active Technologies
- Node.js 18+, TypeScript 5.x (ES2022) + commander 11.x, axios (existing) (004-claude-skill-config)
- `~/.grafana-cli/config.json` (existing, no schema changes) (004-claude-skill-config)

- Node.js 18+ (LTS), TypeScript 5.x (target: ES2022) (001-cli-mvp)
- File system (`~/.grafana-cli/config.json` for server configurations) (001-cli-mvp)

## Recent Changes

- 001-cli-mvp: Added Node.js 18+ (LTS), TypeScript 5.x (target: ES2022)
