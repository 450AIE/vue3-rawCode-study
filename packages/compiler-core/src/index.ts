export function compile(template){
    // 将模版转化为AST语法树
    const ast = parse(template)
    // 对AST语法树处理，产生信息
    transform(ast)
    // 生成代码
    return generate(ast)
}