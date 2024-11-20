
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Select, Grid, FormField } from "@cloudscape-design/components"
import { fetchByValue } from './fetchHelper'

export default forwardRef(({ }, ref) => {
    const [selectedOption, setSelectedOption] = useState({});
    const [prompts, setPrompts] = useState([{ name: "", prompt: false }])


    useImperativeHandle(ref, () => ({
        getPrompt() {
            return selectedOption.value
        }
    }))


    const getList = async () => {
        let list = await fetchByValue("listPrompts")
        list.unshift(
            { label: "Default Prompt for Retrieve => LLM", 
              value: "Use the following pieces of documents to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Provide sources (in the <source> tags within your response)" 
            }
        )
        console.log(list);
        let first = list[0]
        setPrompts(list)
        if (first) {
            setSelectedOption({ label: first.name, value: first.prompt })
        }

    }

    useEffect(() => {
        getList()
    }, [])

    const getOptions = () => {
        const options = prompts ? prompts.map(pr => {
            return { label: pr.name, value: pr.prompt }
        }) : []
        return options
    }

    return (

        <Grid gridDefinition={[{ colspan: 12}]}>
            <FormField label="Sytem Prompt">
                <Select selectedOption={selectedOption}
                    label="Prompt"
                    onChange={({ detail }) => {
                        console.log(detail)
                        setSelectedOption(detail.selectedOption)
                    }}
                    options={getOptions()}
                    triggerVariant="option" />
            </FormField>
        </Grid>


    )
})
