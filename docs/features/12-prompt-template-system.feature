# language: zh-TW
功能: 提示詞模板系統——依據 prompts 目錄下的檔案自動替換佔位符

  背景:
    假設 Bot 的系統提示詞檔案為 prompts/system.md
    而且 prompts 目錄下存在多個 Markdown 檔案作為模板片段
    而且 system.md 中使用 {{檔案名稱}} 格式的佔位符來引用其他檔案內容
    而且檔案名稱不含副檔名（例如 {{character_name}} 對應 character_name.md）

  情境: 載入系統提示詞時自動替換佔位符
    假設 prompts/system.md 包含佔位符 "{{character_name}}"
    而且 prompts/character_name.md 的內容為 "蘭堂悠奈 (Randou Yuna)"
    當系統載入系統提示詞
    那麼 "{{character_name}}" 必須被替換為 character_name.md 的內容
    而且替換後的提示詞中不得殘留 "{{character_name}}" 佔位符

  情境: 支援多個不同的佔位符替換
    假設 prompts/system.md 包含以下佔位符
      | 佔位符                       | 對應檔案                      |
      | {{character_name}}           | character_name.md             |
      | {{character_info}}           | character_info.md             |
      | {{character_personality}}    | character_personality.md      |
      | {{character_speaking_style}} | character_speaking_style.md   |
      | {{character_reference_terms}}| character_reference_terms.md  |
    當系統載入系統提示詞
    那麼所有佔位符都必須被替換為對應檔案的內容
    而且替換後的提示詞中不得殘留任何已定義的佔位符

  情境: 同一佔位符在 system.md 中出現多次
    假設 prompts/system.md 中 "{{character_name}}" 出現多次
    而且 prompts/character_name.md 的內容為 "蘭堂悠奈"
    當系統載入系統提示詞
    那麼所有出現的 "{{character_name}}" 都必須被替換
    而且替換結果一致

  情境: 佔位符對應的檔案不存在時保留原樣
    假設 prompts/system.md 包含佔位符 "{{nonexistent_file}}"
    而且 prompts 目錄下不存在 nonexistent_file.md
    當系統載入系統提示詞
    那麼 "{{nonexistent_file}}" 佔位符保留原樣不替換
    而且系統記錄警告訊息

  情境: system.md 自身不作為替換來源
    假設 prompts 目錄下存在 system.md 與 character_name.md
    當系統掃描 prompts 目錄的模板片段檔案
    那麼 system.md 不得被當作佔位符替換的來源
    而且只有非 system.md 的 .md 檔案才作為替換來源

  情境: 替換後的內容會被去除首尾空白
    假設 prompts/character_name.md 的內容前後有多餘空白或換行
    當系統載入並替換佔位符
    那麼替換用的內容必須去除首尾空白（trim）
