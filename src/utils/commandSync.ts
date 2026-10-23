// Discord側に登録済みのコマンドと、コード上の定義が一致するかを判定する。
// アプリケーションコマンドの登録は1ギルドあたり1日200回の上限があるため、
// 内容が変わっていないときは登録リクエストを送らないようにする。
//
// APIの応答には id / application_id / version などの付加フィールドが含まれ、
// 既定値（required: false など）は省略される。そのため比較対象は
// こちらが定義している name / description / options のみに限定する。

type RawChoice = { name: string; value: string | number };

type RawOption = {
  name: string;
  description: string;
  type: number;
  required?: boolean;
  choices?: RawChoice[];
  options?: RawOption[];
};

type RawCommand = {
  name: string;
  description: string;
  options?: RawOption[];
};

function normalizeOption(option: RawOption): unknown {
  return {
    name: option.name,
    description: option.description,
    type: option.type,
    required: Boolean(option.required),
    choices: (option.choices ?? []).map((choice) => ({
      name: choice.name,
      value: choice.value,
    })),
    // サブコマンド・サブコマンドグループは options が入れ子になる
    options: (option.options ?? []).map(normalizeOption),
  };
}

export function normalizeCommand(command: RawCommand): unknown {
  return {
    name: command.name,
    description: command.description,
    // オプションの順序はDiscord側でも意味を持つ（必須が先）のでソートしない
    options: (command.options ?? []).map(normalizeOption),
  };
}

export function commandsMatch(existing: unknown[], desired: unknown[]): boolean {
  const signature = (list: unknown[]) =>
    JSON.stringify(
      (list as RawCommand[])
        .map(normalizeCommand)
        // コマンド自体の並び順は意味を持たないため名前順に揃える
        .sort((a, b) =>
          (a as { name: string }).name.localeCompare((b as { name: string }).name)
        )
    );

  return signature(existing) === signature(desired);
}
